// Package health provides liveness and readiness probe handlers.
package health

import (
	"encoding/json"
	"net/http"
	"time"
)

// Pinger is implemented by any upstream that can report its health.
type Pinger interface {
	Ping(r *http.Request) error
}

// Liveness returns 200 OK as long as the process is running.
func Liveness(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache")
	json.NewEncoder(w).Encode(map[string]string{ //nolint:errcheck
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}

// Readiness checks that the upstream (Supabase) is reachable.
func Readiness(upstream Pinger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-cache")

		if err := upstream.Ping(r); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{ //nolint:errcheck
				"status": "degraded",
				"error":  err.Error(),
			})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{ //nolint:errcheck
			"status": "ready",
			"time":   time.Now().UTC().Format(time.RFC3339),
		})
	}
}
