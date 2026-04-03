package tenant

import (
	"net/http"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
)

// Middleware enforces that a tenant ID is present in the request context.
type Middleware struct{}

// NewMiddleware creates a new tenant Middleware.
func NewMiddleware() *Middleware {
	return &Middleware{}
}

// Handler returns an http.Handler that rejects requests missing a tenant ID in context.
func (m *Middleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, err := FromContext(r.Context())
		if err != nil {
			respond.Error(w, err)
			return
		}
		next.ServeHTTP(w, r)
	})
}
