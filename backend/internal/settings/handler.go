package settings

import (
	"net/http"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

// Handler holds HTTP handler methods for the settings domain.
type Handler struct {
	svc *Service
}

// NewHandler creates a new Handler with the given Service.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleGetSettings handles GET /settings — retrieves settings for the authenticated user.
func (h *Handler) HandleGetSettings(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	s, err := h.svc.Get(r.Context(), tenantID, claims.UserID)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, s)
}

// HandleUpdateSettings handles PUT /settings — updates settings for the authenticated user.
func (h *Handler) HandleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	var input UpdateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	s, err := h.svc.Update(r.Context(), tenantID, claims.UserID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, s)
}
