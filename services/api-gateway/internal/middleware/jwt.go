package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

// EchoClaims represents Supabase JWT claims.
type EchoClaims struct {
	jwt.RegisteredClaims
	Email string `json:"email"`
	Role  string `json:"role"`
	// Supabase adds app_metadata and user_metadata as sub-objects
}

// JWTValidator validates Supabase JWTs using HS256 with the project JWT secret.
type JWTValidator struct {
	secret []byte
	log    *zap.Logger
}

// NewJWTValidator creates a new JWTValidator.
func NewJWTValidator(secret string, log *zap.Logger) *JWTValidator {
	return &JWTValidator{secret: []byte(secret), log: log}
}

// Middleware rejects requests without a valid Bearer JWT.
// The validated user ID (sub claim) is stored in context under CtxUserID.
func (v *JWTValidator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := r.Header.Get("Authorization")
		if raw == "" || !strings.HasPrefix(raw, "Bearer ") {
			http.Error(w, `{"error":"missing authorization token"}`, http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(raw, "Bearer ")

		claims := &EchoClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return v.secret, nil
		}, jwt.WithValidMethods([]string{"HS256"}))

		if err != nil || !token.Valid {
			v.log.Debug("invalid JWT", zap.Error(err))
			http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		// Inject user ID into context so rate limiter and logger can use it
		uid := claims.Subject
		ctx := context.WithValue(r.Context(), CtxUserID, uid)

		// Forward user ID to upstream edge function
		r = r.WithContext(ctx)
		r.Header.Set("X-User-Id", uid)

		next.ServeHTTP(w, r)
	})
}
