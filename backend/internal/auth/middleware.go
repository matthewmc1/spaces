package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

// TokenVerifier validates a raw token string and returns Claims.
type TokenVerifier interface {
	Verify(ctx context.Context, token string) (*Claims, error)
}

// Middleware extracts and verifies the Bearer token from incoming requests.
type Middleware struct {
	verifier TokenVerifier
	resolver *Resolver
}

// NewMiddleware creates a new auth Middleware. The resolver is optional —
// pass nil for dev mode (DevVerifier already returns fully-populated claims).
func NewMiddleware(verifier TokenVerifier, resolver *Resolver) *Middleware {
	return &Middleware{verifier: verifier, resolver: resolver}
}

// Handler returns an http.Handler that validates the Authorization header
// and populates claims and tenant ID into the request context.
func (m *Middleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respond.Error(w, errors.Unauthorized("missing Authorization header"))
			return
		}

		token, ok := strings.CutPrefix(authHeader, "Bearer ")
		if !ok || token == "" {
			respond.Error(w, errors.Unauthorized("invalid Authorization header format"))
			return
		}

		claims, err := m.verifier.Verify(r.Context(), token)
		if err != nil {
			respond.Error(w, errors.Unauthorized("invalid token"))
			return
		}

		if m.resolver != nil {
			claims, err = m.resolver.Resolve(r.Context(), claims)
			if err != nil {
				respond.Error(w, errors.Unauthorized("user resolution failed"))
				return
			}
		}

		ctx := WithClaims(r.Context(), claims)
		ctx = tenant.WithTenantID(ctx, claims.TenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
