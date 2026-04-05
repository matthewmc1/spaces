package spaces

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

// Handler holds HTTP handler methods for the spaces domain.
type Handler struct {
	svc *Service
}

// NewHandler creates a new Handler with the given Service.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleListSpaces handles GET /spaces — lists root spaces for the tenant.
func (h *Handler) HandleListSpaces(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	spaces, err := h.svc.ListRoots(r.Context(), tenantID)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, spaces)
}

// HandleGetSpace handles GET /spaces/{id} — retrieves a single space.
func (h *Handler) HandleGetSpace(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, badID())
		return
	}

	space, err := h.svc.GetByID(r.Context(), tenantID, id)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, space)
}

// HandleGetTree handles GET /spaces/{id}/tree — returns the space tree rooted at id.
func (h *Handler) HandleGetTree(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, badID())
		return
	}

	tree, err := h.svc.GetTree(r.Context(), tenantID, id)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, tree)
}

// HandleCreateSpace handles POST /spaces — creates a new space.
func (h *Handler) HandleCreateSpace(w http.ResponseWriter, r *http.Request) {
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

	var input CreateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	space, err := h.svc.Create(r.Context(), tenantID, claims.UserID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, space)
}

// HandleUpdateSpace handles PUT /spaces/{id} — partially updates a space.
func (h *Handler) HandleUpdateSpace(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, badID())
		return
	}

	var input UpdateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	var actorID uuid.UUID
	if claims, err := auth.FromContext(r.Context()); err == nil {
		actorID = claims.UserID
	}

	space, err := h.svc.Update(r.Context(), tenantID, id, actorID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, space)
}

// HandleDeleteSpace handles DELETE /spaces/{id} — deletes a space.
func (h *Handler) HandleDeleteSpace(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, badID())
		return
	}

	if err := h.svc.Delete(r.Context(), tenantID, id); err != nil {
		respond.Error(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// badID returns a validation error for an invalid space ID.
func badID() error {
	return errors.Validation("invalid space id")
}
