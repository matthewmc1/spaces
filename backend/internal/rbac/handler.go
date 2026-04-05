package rbac

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleListSpaceMembers handles GET /spaces/{id}/members
func (h *Handler) HandleListSpaceMembers(w http.ResponseWriter, r *http.Request) {
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
	assignments, err := h.svc.ListBySpace(r.Context(), tenantID, &spaceID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	if assignments == nil {
		assignments = []RoleAssignment{}
	}
	respond.JSON(w, http.StatusOK, assignments)
}

// HandleAssignSpaceRole handles POST /spaces/{id}/members
// Body: {"user_id": "<uuid>", "role": "member|admin|owner|viewer"}
func (h *Handler) HandleAssignSpaceRole(w http.ResponseWriter, r *http.Request) {
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
	var input struct {
		UserID uuid.UUID `json:"user_id"`
		Role   string    `json:"role"`
	}
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}
	if input.UserID == uuid.Nil {
		respond.Error(w, errors.Validation("user_id is required"))
		return
	}
	if _, ok := roleLevel[input.Role]; !ok {
		respond.Error(w, errors.Validation("role must be owner, admin, member, or viewer"))
		return
	}
	ra, err := h.svc.Assign(r.Context(), tenantID, input.UserID, &spaceID, input.Role)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusCreated, ra)
}

// HandleListTenantMembers handles GET /members (tenant-level assignments)
func (h *Handler) HandleListTenantMembers(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	assignments, err := h.svc.ListBySpace(r.Context(), tenantID, nil)
	if err != nil {
		respond.Error(w, err)
		return
	}
	if assignments == nil {
		assignments = []RoleAssignment{}
	}
	respond.JSON(w, http.StatusOK, assignments)
}

// HandleRevokeRole handles DELETE /role-assignments/{id}
func (h *Handler) HandleRevokeRole(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid role assignment id"))
		return
	}
	if err := h.svc.Revoke(r.Context(), tenantID, id); err != nil {
		respond.Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
