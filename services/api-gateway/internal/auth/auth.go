// Package auth provides API-key authentication for the ECHO API gateway.
//
// Use-case: programmatic / server-side callers (e.g. the simulation-batch
// service, third-party integrations) that cannot obtain a Supabase user JWT
// authenticate via a long-lived API key instead.
//
// How it fits in:
//
//	JWT middleware   — user-facing requests from the mobile/web apps
//	APIKey middleware — machine-to-machine, batch runners, webhooks
//
// API keys are stored in the `api_keys` Postgres table:
//
//	id          uuid PK
//	fingerprint text   NOT NULL UNIQUE  (first 16 hex chars after "echo_" prefix)
//	key_prefix  text   NOT NULL         (first 21 chars; used for constant-time check)
//	owner_id    uuid   NOT NULL         (references auth.users.id)
//	description text
//	scopes      text[] NOT NULL DEFAULT '{}'
//	expires_at  timestamptz             (NULL = never expires)
//	revoked     boolean NOT NULL DEFAULT false
//
// Key format: echo_<64 random hex chars>  (total length 69, URL-safe).
package auth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
)

// ── Key generation ────────────────────────────────────────────────────────────

// NewAPIKey generates a cryptographically random ECHO API key.
// Format: echo_<64 hex chars>  — total length 69.
func NewAPIKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("auth: generate key: %w", err)
	}
	return "echo_" + hex.EncodeToString(b), nil
}

// Fingerprint returns the indexed lookup fragment of an API key
// (16 hex chars that follow the "echo_" prefix).
func Fingerprint(rawKey string) string {
	if len(rawKey) < 21 {
		return ""
	}
	return rawKey[5:21]
}

// ── Cached key record ─────────────────────────────────────────────────────────

// KeyRecord holds the metadata for a validated API key (cached in-process).
type KeyRecord struct {
	OwnerID     string
	Scopes      []string
	Description string
	ExpiresAt   *time.Time
	CachedAt    time.Time
}

// IsExpired returns true if the key has a hard expiry that has passed.
func (k *KeyRecord) IsExpired() bool {
	return k.ExpiresAt != nil && time.Now().After(*k.ExpiresAt)
}

// ── Validator ─────────────────────────────────────────────────────────────────

const (
	cacheMaxAge = 5 * time.Minute
	// HeaderAPIKey is the HTTP request header that carries the API key.
	HeaderAPIKey = "X-Api-Key"
)

// Validator validates ECHO API keys against the Supabase REST API and
// caches results to avoid a round-trip on every request.
type Validator struct {
	mu          sync.RWMutex
	cache       map[string]*KeyRecord // raw key → record
	supabaseURL string
	serviceKey  string
	log         *zap.Logger
	httpClient  *http.Client
}

// NewValidator creates a Validator that authenticates keys against Supabase.
//
//   - supabaseURL: project REST base URL, e.g. https://xyz.supabase.co
//   - serviceKey:  SUPABASE_SERVICE_ROLE_KEY (bypasses RLS; read-only query)
func NewValidator(supabaseURL, serviceKey string, log *zap.Logger) *Validator {
	return &Validator{
		cache:       make(map[string]*KeyRecord),
		supabaseURL: strings.TrimRight(supabaseURL, "/"),
		serviceKey:  serviceKey,
		log:         log,
		httpClient:  &http.Client{Timeout: 5 * time.Second},
	}
}

// Validate checks a raw API key and returns its KeyRecord.
// Results are cached for up to cacheMaxAge.
func (v *Validator) Validate(rawKey string) (*KeyRecord, error) {
	if !strings.HasPrefix(rawKey, "echo_") || len(rawKey) != 69 {
		return nil, errors.New("auth: invalid key format")
	}

	// Fast path: cache hit
	v.mu.RLock()
	rec, ok := v.cache[rawKey]
	v.mu.RUnlock()

	if ok && time.Since(rec.CachedAt) < cacheMaxAge {
		if rec.IsExpired() {
			return nil, errors.New("auth: key is expired")
		}
		return rec, nil
	}

	// Slow path: remote lookup
	rec, err := v.lookupRemote(rawKey)
	if err != nil {
		return nil, err
	}
	if rec.IsExpired() {
		return nil, errors.New("auth: key is expired")
	}

	v.mu.Lock()
	v.cache[rawKey] = rec
	v.mu.Unlock()

	return rec, nil
}

// lookupRemote fetches the key record from the Supabase api_keys table.
// It uses the fingerprint (16-char prefix) for an indexed lookup, then
// constant-time compares the stored key_prefix against the presented key.
func (v *Validator) lookupRemote(rawKey string) (*KeyRecord, error) {
	finger := Fingerprint(rawKey)
	url := fmt.Sprintf(
		"%s/rest/v1/api_keys?fingerprint=eq.%s&revoked=eq.false&select=owner_id,scopes,description,expires_at,key_prefix",
		v.supabaseURL, finger,
	)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("auth: build request: %w", err)
	}
	req.Header.Set("apikey", v.serviceKey)
	req.Header.Set("Authorization", "Bearer "+v.serviceKey)

	resp, err := v.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("auth: supabase lookup: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("auth: supabase returned %d: %s", resp.StatusCode, body)
	}

	var rows []struct {
		OwnerID     string   `json:"owner_id"`
		Scopes      []string `json:"scopes"`
		Description string   `json:"description"`
		ExpiresAt   *string  `json:"expires_at"`
		KeyPrefix   string   `json:"key_prefix"` // first 21 chars of raw key
	}
	if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil {
		return nil, fmt.Errorf("auth: decode response: %w", err)
	}

	if len(rows) == 0 {
		return nil, errors.New("auth: key not found")
	}

	// Constant-time prefix comparison to guard against timing attacks
	storedPrefix := rows[0].KeyPrefix
	presentedPrefix := rawKey
	if len(presentedPrefix) > len(storedPrefix) {
		presentedPrefix = presentedPrefix[:len(storedPrefix)]
	}
	if subtle.ConstantTimeCompare([]byte(presentedPrefix), []byte(storedPrefix)) == 0 {
		return nil, errors.New("auth: key mismatch")
	}

	rec := &KeyRecord{
		OwnerID:     rows[0].OwnerID,
		Scopes:      rows[0].Scopes,
		Description: rows[0].Description,
		CachedAt:    time.Now(),
	}
	if rows[0].ExpiresAt != nil && *rows[0].ExpiresAt != "" {
		if t, err := time.Parse(time.RFC3339, *rows[0].ExpiresAt); err == nil {
			rec.ExpiresAt = &t
		}
	}

	return rec, nil
}

// Purge removes all cached entries, forcing re-validation on the next request.
// Call after a batch revocation event.
func (v *Validator) Purge() {
	v.mu.Lock()
	v.cache = make(map[string]*KeyRecord)
	v.mu.Unlock()
}

// PurgeKey evicts a single key from the cache.
func (v *Validator) PurgeKey(rawKey string) {
	v.mu.Lock()
	delete(v.cache, rawKey)
	v.mu.Unlock()
}

// ── Context keys ──────────────────────────────────────────────────────────────

type ctxKey string

const (
	ctxAPIKeyOwner  ctxKey = "apikey_owner"
	ctxAPIKeyScopes ctxKey = "apikey_scopes"
)

// ── HTTP Middleware ───────────────────────────────────────────────────────────

// Middleware returns an HTTP middleware that accepts requests authenticated
// with an X-Api-Key header.
//
//   - If the header is absent → pass through (JWT middleware handles it next).
//   - If the header is present and valid → inject owner into context and forward.
//   - If the header is present but invalid → reject with 401.
func (v *Validator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rawKey := r.Header.Get(HeaderAPIKey)
		if rawKey == "" {
			next.ServeHTTP(w, r)
			return
		}

		rec, err := v.Validate(rawKey)
		if err != nil {
			v.log.Debug("API key rejected", zap.Error(err), zap.String("path", r.URL.Path))
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"invalid or expired api key"}`, http.StatusUnauthorized)
			return
		}

		// Inject owner into context and set the same X-User-Id header the JWT
		// middleware would set, so downstream proxy code is auth-method agnostic.
		ctx := context.WithValue(r.Context(), ctxAPIKeyOwner, rec.OwnerID)
		ctx = context.WithValue(ctx, ctxAPIKeyScopes, rec.Scopes)

		r = r.WithContext(ctx)
		r.Header.Set("X-User-Id", rec.OwnerID)
		r.Header.Set("X-Auth-Method", "apikey")

		next.ServeHTTP(w, r)
	})
}

// ── Context helpers ───────────────────────────────────────────────────────────

// OwnerFromContext extracts the API key owner ID from request context.
// Returns "" if the request was not authenticated via API key.
func OwnerFromContext(r *http.Request) string {
	v, _ := r.Context().Value(ctxAPIKeyOwner).(string)
	return v
}

// ScopesFromContext extracts the scopes granted to the API key in context.
func ScopesFromContext(r *http.Request) []string {
	v, _ := r.Context().Value(ctxAPIKeyScopes).([]string)
	return v
}

// HasScope returns true if the API key in context has the requested scope.
// The wildcard scope "*" grants all permissions.
func HasScope(r *http.Request, scope string) bool {
	for _, s := range ScopesFromContext(r) {
		if s == scope || s == "*" {
			return true
		}
	}
	return false
}
