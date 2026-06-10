// Package proxy implements the reverse proxy to Supabase Edge Functions.
//
// URL rewriting:
//
//	/v1/entries                → {SUPABASE_URL}/functions/v1/process-journal-entry
//	/v1/memories/search        → {SUPABASE_URL}/functions/v1/memory-retrieve
//	/v1/identity               → {SUPABASE_URL}/functions/v1/identity-infer
//	/v1/future-self            → {SUPABASE_URL}/functions/v1/future-self
//	/v1/echo                   → {SUPABASE_URL}/functions/v1/echo-ai
//	/v1/digest                 → {SUPABASE_URL}/functions/v1/generate-daily-insight
//	/internal/batch/simulate   → {SUPABASE_URL}/functions/v1/update-future-self
//	/internal/batch/notify     → {SUPABASE_URL}/functions/v1/ai-push-notifications
//	/internal/batch/patterns   → {SUPABASE_URL}/functions/v1/pattern-detect
package proxy

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"go.uber.org/zap"
)

// route maps a gateway path prefix → Supabase edge function path.
type route struct {
	prefix   string
	upstream string
}

var routes = []route{
	{"/v1/entries",           "/functions/v1/process-journal-entry"},
	{"/v1/memories/search",   "/functions/v1/memory-retrieve"},
	{"/v1/memories",          "/functions/v1/memory-ingest"},
	{"/v1/identity/share",    "/functions/v1/generate-share-card"},
	{"/v1/identity",          "/functions/v1/identity-infer"},
	{"/v1/future-self",       "/functions/v1/future-self"},
	{"/v1/echo",              "/functions/v1/echo-ai"},
	{"/v1/digest",            "/functions/v1/generate-daily-insight"},
	{"/v1/safety",            "/functions/v1/safety-check"},
	{"/v1/emotion",           "/functions/v1/emotion-analyze"},
	{"/internal/batch/simulate", "/functions/v1/update-future-self"},
	{"/internal/batch/notify",   "/functions/v1/ai-push-notifications"},
	{"/internal/batch/patterns", "/functions/v1/pattern-detect"},
	{"/internal/batch/digest",   "/functions/v1/generate-daily-insight"},
}

// Config for the proxy.
type Config struct {
	SupabaseURL     string
	SupabaseAnonKey string
	Logger          *zap.Logger
}

// EdgeProxy is an http.Handler that reverse-proxies to Supabase Edge Functions.
type EdgeProxy struct {
	rp     *httputil.ReverseProxy
	base   *url.URL
	anonKey string
	log    *zap.Logger
}

// New creates an EdgeProxy.
func New(cfg Config) (*EdgeProxy, error) {
	base, err := url.Parse(cfg.SupabaseURL)
	if err != nil {
		return nil, err
	}

	ep := &EdgeProxy{
		base:    base,
		anonKey: cfg.SupabaseAnonKey,
		log:     cfg.Logger,
	}

	ep.rp = &httputil.ReverseProxy{
		Director:       ep.director,
		ModifyResponse: ep.modifyResponse,
		ErrorHandler:   ep.errorHandler,
	}

	return ep, nil
}

// ServeHTTP implements http.Handler.
func (ep *EdgeProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ep.rp.ServeHTTP(w, r)
}

// Ping checks that the Supabase URL is reachable (for /readyz).
func (ep *EdgeProxy) Ping(r *http.Request) error {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, ep.base.String()+"/functions/v1/", nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	return nil
}

// director rewrites the incoming request path to the target edge function URL.
func (ep *EdgeProxy) director(req *http.Request) {
	inPath := req.URL.Path

	// Match longest prefix first
	upstream := ""
	for _, r := range routes {
		if strings.HasPrefix(inPath, r.prefix) {
			upstream = r.upstream
			break
		}
	}

	if upstream == "" {
		// No route matched — send to a 404 handler by routing to a known path
		upstream = "/functions/v1/404"
	}

	req.URL.Scheme = ep.base.Scheme
	req.URL.Host   = ep.base.Host
	req.URL.Path   = upstream

	// Forward the original Authorization header; add anon key as fallback
	if req.Header.Get("Authorization") == "" && ep.anonKey != "" {
		req.Header.Set("Authorization", "Bearer "+ep.anonKey)
	}

	// Tag the request so edge functions can log the original path
	req.Header.Set("X-Original-Path", inPath)
	req.Header.Set("X-Forwarded-Host", req.Host)
	req.Host = ep.base.Host
}

func (ep *EdgeProxy) modifyResponse(resp *http.Response) error {
	// Remove headers that shouldn't leak to clients
	resp.Header.Del("X-Powered-By")
	resp.Header.Del("Server")
	return nil
}

func (ep *EdgeProxy) errorHandler(w http.ResponseWriter, r *http.Request, err error) {
	ep.log.Error("proxy error", zap.String("path", r.URL.Path), zap.Error(err))
	http.Error(w, `{"error":"upstream unavailable"}`, http.StatusBadGateway)
}
