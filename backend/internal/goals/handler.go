package goals

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

// Handler holds HTTP handler methods for the goals domain.
type Handler struct {
	svc *Service
}

// NewHandler creates a new Handler with the given Service.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleListGoals handles GET /spaces/{id}/goals
func (h *Handler) HandleListGoals(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	spaceID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid space id"))
		return
	}

	goals, err := h.svc.ListBySpace(r.Context(), tenantID, spaceID)
	if err != nil {
		respond.Error(w, err)
		return
	}

	if goals == nil {
		goals = []Goal{}
	}

	respond.JSON(w, http.StatusOK, goals)
}

// HandleCreateGoal handles POST /spaces/{id}/goals
func (h *Handler) HandleCreateGoal(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	spaceID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid space id"))
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

	goal, err := h.svc.Create(r.Context(), tenantID, spaceID, claims.UserID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, goal)
}

// HandleUpdateGoal handles PUT /goals/{id}
func (h *Handler) HandleUpdateGoal(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	goalID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid goal id"))
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

	goal, err := h.svc.Update(r.Context(), tenantID, goalID, actorID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, goal)
}

// HandleDeleteGoal handles DELETE /goals/{id}
func (h *Handler) HandleDeleteGoal(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	goalID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid goal id"))
		return
	}

	var actorID uuid.UUID
	if claims, err := auth.FromContext(r.Context()); err == nil {
		actorID = claims.UserID
	}

	if err := h.svc.Delete(r.Context(), tenantID, goalID, actorID); err != nil {
		respond.Error(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleCreateLink handles POST /goals/{id}/links
func (h *Handler) HandleCreateLink(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	goalID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid goal id"))
		return
	}

	var input CreateLinkInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	link, err := h.svc.CreateLink(r.Context(), tenantID, goalID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, link)
}

// HandleGetChain handles GET /goals/{id}/chain
func (h *Handler) HandleGetChain(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	goalID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid goal id"))
		return
	}
	chain, err := h.svc.GetChain(r.Context(), tenantID, goalID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, chain)
}

// HandleDeleteLink handles DELETE /goal-links/{id}
func (h *Handler) HandleDeleteLink(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	linkID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid link id"))
		return
	}

	if err := h.svc.DeleteLink(r.Context(), tenantID, linkID); err != nil {
		respond.Error(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
