package rollup

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

func (h *Handler) HandleSpaceRollup(w http.ResponseWriter, r *http.Request) {
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
	rollup, err := h.svc.GetSpaceRollup(r.Context(), tenantID, spaceID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, rollup)
}

func (h *Handler) HandleOrgRollup(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	rollup, err := h.svc.GetOrgRollup(r.Context(), tenantID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, rollup)
}

func (h *Handler) HandleProgrammeRollup(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	programmeID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	rollup, err := h.svc.GetProgrammeRollup(r.Context(), tenantID, programmeID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, rollup)
}

func (h *Handler) HandlePortfolio(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	result, err := h.svc.GetPortfolio(r.Context(), tenantID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, result)
}
