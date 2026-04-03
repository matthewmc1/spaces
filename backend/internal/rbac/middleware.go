package rbac

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

// RequireRole returns middleware that checks the user has at least the given role.
// It extracts space ID from the request path parameter "id" if present.
func RequireRole(svc *Service, requiredRole string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID, err := tenant.FromContext(r.Context())
			if err != nil {
				respond.Error(w, err)
				return
			}

			claims, err := auth.FromContext(r.Context())
			if err != nil {
				respond.Error(w, err)
				return
			}

			// Try to extract space ID from path
			var spaceID *uuid.UUID
			if idStr := r.PathValue("id"); idStr != "" {
				if id, err := uuid.Parse(idStr); err == nil {
					spaceID = &id
				}
			}

			if err := svc.CheckPermission(r.Context(), tenantID, claims.UserID, spaceID, requiredRole); err != nil {
				respond.Error(w, err)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
