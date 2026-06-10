package auth_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/UTA0619/echo-self/services/api-gateway/internal/auth"
)

// ── Key generation ─────────────────────────────────────────────────────────────

func TestNewAPIKey_Format(t *testing.T) {
	key, err := auth.NewAPIKey()
	if err != nil {
		t.Fatalf("NewAPIKey() error: %v", err)
	}
	if !strings.HasPrefix(key, "echo_") {
		t.Errorf("key should start with echo_, got %q", key[:10])
	}
	if len(key) != 69 {
		t.Errorf("key length want 69, got %d", len(key))
	}
}

func TestNewAPIKey_Unique(t *testing.T) {
	k1, _ := auth.NewAPIKey()
	k2, _ := auth.NewAPIKey()
	if k1 == k2 {
		t.Error("NewAPIKey() returned same key twice")
	}
}

func TestFingerprint(t *testing.T) {
	key := "echo_" + strings.Repeat("a", 64) // 69 chars
	fp := auth.Fingerprint(key)
	if len(fp) != 16 {
		t.Errorf("Fingerprint length want 16, got %d", len(fp))
	}
	if fp != strings.Repeat("a", 16) {
		t.Errorf("Fingerprint want %q, got %q", strings.Repeat("a", 16), fp)
	}
}

func TestFingerprint_Short(t *testing.T) {
	fp := auth.Fingerprint("short")
	if fp != "" {
		t.Errorf("Fingerprint of short key should be empty, got %q", fp)
	}
}

// ── Validate format checks ─────────────────────────────────────────────────────

func TestValidate_BadFormat(t *testing.T) {
	v := auth.NewValidator("https://example.supabase.co", "service-key", zap.NewNop())

	cases := []string{
		"",
		"invalid",
		"jwt_token_not_echo_prefix",
		"echo_tooshort",
		"echo_" + strings.Repeat("x", 63), // 68 chars (one short)
		"echo_" + strings.Repeat("x", 65), // 70 chars (one over)
	}
	for _, tc := range cases {
		_, err := v.Validate(tc)
		if err == nil {
			t.Errorf("Validate(%q) should return error, got nil", tc)
		}
	}
}

// ── Middleware ─────────────────────────────────────────────────────────────────

func TestMiddleware_NoHeader_PassThrough(t *testing.T) {
	v := auth.NewValidator("https://example.supabase.co", "key", zap.NewNop())

	called := false
	handler := v.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/echo", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if !called {
		t.Error("next handler should have been called when no X-Api-Key header present")
	}
	if rr.Code != http.StatusOK {
		t.Errorf("status want 200, got %d", rr.Code)
	}
}

func TestMiddleware_InvalidFormat_Rejects(t *testing.T) {
	v := auth.NewValidator("https://example.supabase.co", "key", zap.NewNop())

	called := false
	handler := v.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/echo", nil)
	req.Header.Set(auth.HeaderAPIKey, "not_an_echo_key")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if called {
		t.Error("next handler should NOT be called when API key is invalid")
	}
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("status want 401, got %d", rr.Code)
	}
}

// ── Mock Supabase server for integration-style tests ──────────────────────────

func newMockSupabase(t *testing.T, rows string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") == "" {
			http.Error(w, "no auth", http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(rows)) //nolint:errcheck
	}))
}

func TestValidate_RemoteLookup_Success(t *testing.T) {
	// Build a valid 69-char key
	rawKey := "echo_" + strings.Repeat("b", 64)
	prefix := rawKey[:21]
	finger := auth.Fingerprint(rawKey)

	srv := newMockSupabase(t, `[{
		"owner_id": "user-uuid-123",
		"scopes": ["read", "write"],
		"description": "test key",
		"expires_at": null,
		"key_prefix": "`+prefix+`",
		"fingerprint": "`+finger+`"
	}]`)
	defer srv.Close()

	v := auth.NewValidator(srv.URL, "service-key", zap.NewNop())

	rec, err := v.Validate(rawKey)
	if err != nil {
		t.Fatalf("Validate() unexpected error: %v", err)
	}
	if rec.OwnerID != "user-uuid-123" {
		t.Errorf("OwnerID want %q, got %q", "user-uuid-123", rec.OwnerID)
	}
	if len(rec.Scopes) != 2 {
		t.Errorf("Scopes want 2 items, got %d", len(rec.Scopes))
	}
}

func TestValidate_RemoteLookup_NotFound(t *testing.T) {
	srv := newMockSupabase(t, `[]`)
	defer srv.Close()

	rawKey := "echo_" + strings.Repeat("c", 64)
	v := auth.NewValidator(srv.URL, "service-key", zap.NewNop())

	_, err := v.Validate(rawKey)
	if err == nil {
		t.Error("Validate() should return error when key not in DB")
	}
}

func TestValidate_Cache_Hit(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		rawKey := "echo_" + strings.Repeat("d", 64)
		prefix := rawKey[:21]
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[{"owner_id":"uid","scopes":[],"description":"","expires_at":null,"key_prefix":"` + prefix + `"}]`)) //nolint:errcheck
	}))
	defer srv.Close()

	rawKey := "echo_" + strings.Repeat("d", 64)
	v := auth.NewValidator(srv.URL, "service-key", zap.NewNop())

	for i := 0; i < 5; i++ {
		_, err := v.Validate(rawKey)
		if err != nil {
			t.Fatalf("Validate() iteration %d: %v", i, err)
		}
	}

	if calls != 1 {
		t.Errorf("Supabase should be called only once (cache), got %d calls", calls)
	}
}

func TestPurgeKey(t *testing.T) {
	rawKey := "echo_" + strings.Repeat("e", 64)
	calls := 0

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		prefix := rawKey[:21]
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[{"owner_id":"uid","scopes":[],"description":"","expires_at":null,"key_prefix":"` + prefix + `"}]`)) //nolint:errcheck
	}))
	defer srv.Close()

	v := auth.NewValidator(srv.URL, "service-key", zap.NewNop())

	v.Validate(rawKey) //nolint:errcheck — first call populates cache
	v.PurgeKey(rawKey)
	v.Validate(rawKey) //nolint:errcheck — should hit remote again

	if calls != 2 {
		t.Errorf("after PurgeKey expect 2 remote calls, got %d", calls)
	}
}

// ── KeyRecord helpers ─────────────────────────────────────────────────────────

func TestKeyRecord_IsExpired(t *testing.T) {
	past := time.Now().Add(-time.Hour)
	future := time.Now().Add(time.Hour)

	expired := &auth.KeyRecord{ExpiresAt: &past}
	if !expired.IsExpired() {
		t.Error("key with past expiry should be expired")
	}

	valid := &auth.KeyRecord{ExpiresAt: &future}
	if valid.IsExpired() {
		t.Error("key with future expiry should not be expired")
	}

	noExpiry := &auth.KeyRecord{}
	if noExpiry.IsExpired() {
		t.Error("key with nil expiry should never be expired")
	}
}

// ── Scope helpers ─────────────────────────────────────────────────────────────

func TestHasScope(t *testing.T) {
	rawKey := "echo_" + strings.Repeat("f", 64)
	prefix := rawKey[:21]

	srv := newMockSupabase(t, `[{
		"owner_id":"uid",
		"scopes":["read","entries:write"],
		"description":"",
		"expires_at":null,
		"key_prefix":"`+prefix+`"
	}]`)
	defer srv.Close()

	v := auth.NewValidator(srv.URL, "service-key", zap.NewNop())

	var capturedReq *http.Request
	handler := v.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedReq = r
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1/entries", nil)
	req.Header.Set(auth.HeaderAPIKey, rawKey)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	if capturedReq == nil {
		t.Fatal("next handler not called")
	}
	if !auth.HasScope(capturedReq, "read") {
		t.Error("HasScope('read') should be true")
	}
	if !auth.HasScope(capturedReq, "entries:write") {
		t.Error("HasScope('entries:write') should be true")
	}
	if auth.HasScope(capturedReq, "admin") {
		t.Error("HasScope('admin') should be false")
	}
}

func TestHasScope_Wildcard(t *testing.T) {
	rawKey := "echo_" + strings.Repeat("g", 64)
	prefix := rawKey[:21]

	srv := newMockSupabase(t, `[{
		"owner_id":"uid",
		"scopes":["*"],
		"description":"admin key",
		"expires_at":null,
		"key_prefix":"`+prefix+`"
	}]`)
	defer srv.Close()

	v := auth.NewValidator(srv.URL, "service-key", zap.NewNop())

	var capturedReq *http.Request
	handler := v.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedReq = r
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodDelete, "/v1/admin/anything", nil)
	req.Header.Set(auth.HeaderAPIKey, rawKey)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	if !auth.HasScope(capturedReq, "admin") {
		t.Error("wildcard scope should grant any permission")
	}
	if !auth.HasScope(capturedReq, "entries:delete") {
		t.Error("wildcard scope should grant any permission")
	}
}
