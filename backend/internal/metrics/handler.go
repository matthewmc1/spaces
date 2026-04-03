package metrics

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

func (h *Handler) HandleFlowMetrics(w http.ResponseWriter, r *http.Request) {
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
	result, err := h.svc.FlowMetrics(r.Context(), tenantID, spaceID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, result)
}

func (h *Handler) HandleAlignmentMetrics(w http.ResponseWriter, r *http.Request) {
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
	result, err := h.svc.AlignmentMetrics(r.Context(), tenantID, spaceID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, result)
}
