// ECHO API Gateway
//
// A lightweight Go reverse proxy that sits in front of Supabase Edge Functions.
// Responsibilities:
//   - JWT validation (Supabase HS256 / RS256)
//   - Per-user rate limiting (token bucket via Redis)
//   - Request routing to named edge functions
//   - Structured access logging (zap)
//   - /healthz and /readyz probes
//
// Configuration (env vars):
//
//	PORT                  HTTP listen port (default: 8080)
//	SUPABASE_URL          Supabase project URL
//	SUPABASE_ANON_KEY     Supabase anon key (for downstream forwarding)
//	SUPABASE_JWT_SECRET   HS256 secret used by Supabase Auth
//	REDIS_URL             Redis connection string (rate-limit state)
//	RATE_LIMIT_RPM        Requests per minute per user (default: 60)
//	CRON_SECRET           Secret for internal cron endpoints
package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/UTA0619/echo-self/services/api-gateway/internal/health"
	"github.com/UTA0619/echo-self/services/api-gateway/internal/middleware"
	"github.com/UTA0619/echo-self/services/api-gateway/internal/proxy"
)

func main() {
	// ── Logger ──────────────────────────────────────────────────────────────
	var log *zap.Logger
	var err error
	if os.Getenv("ENV") == "production" {
		log, err = zap.NewProduction()
	} else {
		log, err = zap.NewDevelopment()
	}
	if err != nil {
		panic(err)
	}
	defer log.Sync() //nolint:errcheck

	// ── Config ───────────────────────────────────────────────────────────────
	cfg := loadConfig(log)

	// ── Proxy ────────────────────────────────────────────────────────────────
	edgeProxy, err := proxy.New(proxy.Config{
		SupabaseURL:    cfg.SupabaseURL,
		SupabaseAnonKey: cfg.SupabaseAnonKey,
		Logger:         log,
	})
	if err != nil {
		log.Fatal("failed to create proxy", zap.Error(err))
	}

	// ── Rate limiter ─────────────────────────────────────────────────────────
	limiter, err := middleware.NewRateLimiter(middleware.RateLimiterConfig{
		RedisURL: cfg.RedisURL,
		RPM:      cfg.RateLimitRPM,
		Logger:   log,
	})
	if err != nil {
		log.Warn("Redis unavailable — using in-memory rate limiter", zap.Error(err))
		limiter = middleware.NewMemoryRateLimiter(cfg.RateLimitRPM, log)
	}

	// ── JWT validator ────────────────────────────────────────────────────────
	jwtValidator := middleware.NewJWTValidator(cfg.JWTSecret, log)

	// ── Mux ──────────────────────────────────────────────────────────────────
	mux := http.NewServeMux()

	// Health probes (no auth required)
	mux.HandleFunc("GET /healthz", health.Liveness)
	mux.HandleFunc("GET /readyz",  health.Readiness(edgeProxy))

	// Internal cron endpoints (cron-secret auth, no JWT)
	mux.Handle("POST /internal/", middleware.CronAuth(cfg.CronSecret, log)(edgeProxy))

	// Public API routes — JWT + rate limit
	apiHandler := middleware.Chain(
		middleware.RequestID,
		middleware.Logger(log),
		jwtValidator.Middleware,
		limiter.Middleware,
		middleware.CORS(cfg.AllowedOrigins),
	)(edgeProxy)
	mux.Handle("/v1/", apiHandler)

	// ── Server ───────────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Info("API gateway starting", zap.String("addr", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server error", zap.Error(err))
		}
	}()

	<-ctx.Done()
	log.Info("Shutting down…")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("shutdown error", zap.Error(err))
	}
	log.Info("Gateway stopped")
}
