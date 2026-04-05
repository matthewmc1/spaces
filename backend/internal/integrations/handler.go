package integrations

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

// Handler holds HTTP handler methods for the integrations domain.
type Handler struct {
	svc *Service
}

// NewHandler creates a new Handler with the given Service.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleListIntegrations handles GET /integrations
func (h *Handler) HandleListIntegrations(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	integrations, err := h.svc.ListByTenant(r.Context(), tenantID)
	if err != nil {
		respond.Error(w, err)
		return
	}

	if integrations == nil {
		integrations = []Integration{}
	}

	respond.JSON(w, http.StatusOK, integrations)
}

// HandleCreateIntegration handles POST /integrations
func (h *Handler) HandleCreateIntegration(w http.ResponseWriter, r *http.Request) {
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

	integration, err := h.svc.Create(r.Context(), tenantID, claims.UserID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, integration)
}

// HandleUpdateIntegration handles PUT /integrations/{id}
func (h *Handler) HandleUpdateIntegration(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid integration id"))
		return
	}

	var input UpdateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	integration, err := h.svc.Update(r.Context(), tenantID, id, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, integration)
}

// HandleDeleteIntegration handles DELETE /integrations/{id}
func (h *Handler) HandleDeleteIntegration(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid integration id"))
		return
	}

	if err := h.svc.Delete(r.Context(), tenantID, id); err != nil {
		respond.Error(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleListCardLinks handles GET /cards/{id}/links
func (h *Handler) HandleListCardLinks(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	cardID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid card id"))
		return
	}

	links, err := h.svc.ListByCard(r.Context(), tenantID, cardID)
	if err != nil {
		respond.Error(w, err)
		return
	}

	if links == nil {
		links = []CardLink{}
	}

	respond.JSON(w, http.StatusOK, links)
}

// HandleCreateCardLink handles POST /cards/{id}/links
func (h *Handler) HandleCreateCardLink(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	cardID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid card id"))
		return
	}

	var input CreateCardLinkInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	link, err := h.svc.CreateCardLink(r.Context(), tenantID, cardID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, link)
}

// HandleDeleteCardLink handles DELETE /card-links/{id}
func (h *Handler) HandleDeleteCardLink(w http.ResponseWriter, r *http.Request) {
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

	if err := h.svc.DeleteCardLink(r.Context(), tenantID, linkID); err != nil {
		respond.Error(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
