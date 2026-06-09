// Package middleware provides HTTP middleware for the ECHO API gateway.
package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

// contextKey avoids collisions in request contexts.
type contextKey string

const (
	CtxRequestID contextKey = "request_id"
	CtxUserID    contextKey = "user_id"
)

// Chain chains multiple middleware in order (outermost first).
func Chain(mws ...func(http.Handler) http.Handler) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		for i := len(mws) - 1; i >= 0; i-- {
			next = mws[i](next)
		}
		return next
	}
}

// newRequestID generates a random 16-byte hex ID (no external dependencies).
func newRequestID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// RequestID injects a random ID into every request context and response header.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if id == "" {
			id = newRequestID()
		}
		ctx := context.WithValue(r.Context(), CtxRequestID, id)
		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Logger logs each request with method, path, status, and latency.
func Logger(log *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := &statusRecorder{ResponseWriter: w, status: 200}
			next.ServeHTTP(rw, r)

			rid, _ := r.Context().Value(CtxRequestID).(string)
			uid, _ := r.Context().Value(CtxUserID).(string)

			log.Info("request",
				zap.String("method",   r.Method),
				zap.String("path",     r.URL.Path),
				zap.Int("status",      rw.status),
				zap.Duration("latency", time.Since(start)),
				zap.String("request_id", rid),
				zap.String("user_id",  uid),
				zap.String("remote",   r.RemoteAddr),
			)
		})
	}
}

// CORS adds CORS headers for the allowed origins.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[o] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if _, ok := allowed[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			}
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-Id")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// CronAuth protects internal endpoints with a shared CRON_SECRET.
// Accepts Bearer token or X-Cron-Secret header.
func CronAuth(secret string, log *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if secret == "" {
				// No secret configured — block all internal calls
				http.Error(w, `{"error":"internal endpoints disabled"}`, http.StatusForbidden)
				return
			}

			token := r.Header.Get("X-Cron-Secret")
			if token == "" {
				token = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			}

			// Constant-time comparison
			expected := hmacSign(secret, r.URL.Path)
			actual   := hmacSign(token,  r.URL.Path)
			if !hmac.Equal([]byte(actual), []byte(expected)) && token != secret {
				log.Warn("rejected cron call", zap.String("path", r.URL.Path))
				http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// statusRecorder captures the HTTP status code written by downstream handlers.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func hmacSign(key, data string) string {
	h := hmac.New(sha256.New, []byte(key))
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}
