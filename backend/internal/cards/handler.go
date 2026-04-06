package cards

import (
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

// Handler holds HTTP handler methods for the cards domain.
type Handler struct {
	svc *Service
}

// NewHandler creates a new Handler with the given Service.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleListCards handles GET /spaces/{id}/cards
func (h *Handler) HandleListCards(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	spaceID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	q := r.URL.Query()
	filters := ListFilters{
		Column:   Column(q.Get("column")),
		Priority: q.Get("priority"),
	}
	if assigneeStr := q.Get("assignee"); assigneeStr != "" {
		if id, err := uuid.Parse(assigneeStr); err == nil {
			filters.Assignee = &id
		}
	}

	page := pagination.ParseFromRequest(r)

	cards, nextCursor, err := h.svc.ListBySpace(r.Context(), tenantID, spaceID, filters, page)
	if err != nil {
		slog.Error("ListCards failed", "error", err, "space_id", spaceID)
		respond.Error(w, err)
		return
	}

	if cards == nil {
		cards = []Card{}
	}

	resp := pagination.Response[Card]{
		Data: cards,
		Pagination: pagination.PageInfo{
			NextCursor: nextCursor,
			HasMore:    nextCursor != "",
		},
	}

	respond.JSON(w, http.StatusOK, resp)
}

// HandleCreateCard handles POST /spaces/{id}/cards
func (h *Handler) HandleCreateCard(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	spaceID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	var input CreateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	var createdBy uuid.UUID
	if claims, err := auth.FromContext(r.Context()); err == nil {
		createdBy = claims.UserID
	}

	card, err := h.svc.Create(r.Context(), tenantID, spaceID, createdBy, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, card)
}

// HandleUpdateCard handles PUT /cards/{id}
func (h *Handler) HandleUpdateCard(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	cardID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
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

	card, err := h.svc.Update(r.Context(), tenantID, cardID, actorID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, card)
}

// HandleMoveCard handles PATCH /cards/{id}/move
func (h *Handler) HandleMoveCard(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	cardID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	var input MoveInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	var actorID uuid.UUID
	if claims, err := auth.FromContext(r.Context()); err == nil {
		actorID = claims.UserID
	}

	card, err := h.svc.Move(r.Context(), tenantID, cardID, actorID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, card)
}

// HandleDeleteCard handles DELETE /cards/{id}
func (h *Handler) HandleDeleteCard(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	cardID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	var actorID uuid.UUID
	if claims, err := auth.FromContext(r.Context()); err == nil {
		actorID = claims.UserID
	}

	if err := h.svc.Delete(r.Context(), tenantID, cardID, actorID); err != nil {
		respond.Error(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
