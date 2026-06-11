package middleware

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// RateLimiterConfig configures the rate limiter.
type RateLimiterConfig struct {
	RedisURL string
	RPM      int
	Logger   *zap.Logger
}

// RateLimiter is an http middleware that enforces per-user request quotas.
type RateLimiter interface {
	Middleware(http.Handler) http.Handler
}

// ── Redis-backed rate limiter ─────────────────────────────────────────────────

type redisRateLimiter struct {
	rdb    *redis.Client
	rpm    int
	window time.Duration
	log    *zap.Logger
}

// NewRateLimiter creates a Redis-backed sliding-window rate limiter.
// Returns an error if Redis is unreachable.
func NewRateLimiter(cfg RateLimiterConfig) (RateLimiter, error) {
	opts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid Redis URL: %w", err)
	}

	rdb := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		rdb.Close()
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	return &redisRateLimiter{
		rdb:    rdb,
		rpm:    cfg.RPM,
		window: time.Minute,
		log:    cfg.Logger,
	}, nil
}

func (rl *redisRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid, _ := r.Context().Value(CtxUserID).(string)
		if uid == "" {
			// No user ID — pass through (should be caught by JWT middleware)
			next.ServeHTTP(w, r)
			return
		}

		key := fmt.Sprintf("echo:rl:%s", uid)
		ctx := r.Context()

		// Increment counter with 60-second TTL (sliding window approximation)
		pipe := rl.rdb.Pipeline()
		incr := pipe.Incr(ctx, key)
		pipe.Expire(ctx, key, rl.window)
		if _, err := pipe.Exec(ctx); err != nil {
			// Redis failure — fail open
			rl.log.Warn("rate-limit redis error", zap.Error(err))
			next.ServeHTTP(w, r)
			return
		}

		count := incr.Val()
		w.Header().Set("X-RateLimit-Limit",     fmt.Sprintf("%d", rl.rpm))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", max(0, int64(rl.rpm)-count)))

		if count > int64(rl.rpm) {
			rl.log.Warn("rate limit exceeded", zap.String("user_id", uid), zap.Int64("count", count))
			w.Header().Set("Retry-After", "60")
			http.Error(w, `{"error":"rate limit exceeded","retry_after":60}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

// ── In-memory fallback rate limiter ──────────────────────────────────────────

type memoryRateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*rate.Limiter
	rpm      int
	log      *zap.Logger
}

// NewMemoryRateLimiter creates an in-process token-bucket rate limiter.
// Used when Redis is unavailable. Not suitable for multi-replica deployments.
func NewMemoryRateLimiter(rpm int, log *zap.Logger) RateLimiter {
	return &memoryRateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rpm:      rpm,
		log:      log,
	}
}

func (m *memoryRateLimiter) getLimiter(userID string) *rate.Limiter {
	m.mu.Lock()
	defer m.mu.Unlock()

	if lim, ok := m.limiters[userID]; ok {
		return lim
	}
	// Token bucket: rpm tokens per 60 seconds, burst = rpm/4
	lim := rate.NewLimiter(rate.Every(time.Minute/time.Duration(m.rpm)), m.rpm/4+1)
	m.limiters[userID] = lim
	return lim
}

func (m *memoryRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid, _ := r.Context().Value(CtxUserID).(string)
		if uid == "" {
			next.ServeHTTP(w, r)
			return
		}

		lim := m.getLimiter(uid)
		if !lim.Allow() {
			http.Error(w, `{"error":"rate limit exceeded","retry_after":60}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
