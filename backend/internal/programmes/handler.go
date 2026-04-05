package programmes

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
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

func (h *Handler) HandleListProgrammes(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	programmes, err := h.svc.ListByTenant(r.Context(), tenantID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	if programmes == nil {
		programmes = []Programme{}
	}
	respond.JSON(w, http.StatusOK, programmes)
}

func (h *Handler) HandleGetProgramme(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	p, err := h.svc.GetByID(r.Context(), tenantID, id)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, p)
}

func (h *Handler) HandleCreateProgramme(w http.ResponseWriter, r *http.Request) {
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
	p, err := h.svc.Create(r.Context(), tenantID, claims.UserID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusCreated, p)
}

func (h *Handler) HandleUpdateProgramme(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	var input UpdateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}
	p, err := h.svc.Update(r.Context(), tenantID, id, input)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, p)
}

func (h *Handler) HandleDeleteProgramme(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	if err := h.svc.Delete(r.Context(), tenantID, id); err != nil {
		respond.Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleListSpaces(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	links, err := h.svc.ListSpaces(r.Context(), tenantID, id)
	if err != nil {
		respond.Error(w, err)
		return
	}
	if links == nil {
		links = []ProgrammeSpace{}
	}
	respond.JSON(w, http.StatusOK, links)
}

// HandleListProgrammesForSpace handles GET /spaces/{id}/programmes — list programmes
// this space contributes to or owns.
func (h *Handler) HandleListProgrammesForSpace(w http.ResponseWriter, r *http.Request) {
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
	programmes, err := h.svc.ListByTenantSpace(r.Context(), tenantID, spaceID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	if programmes == nil {
		programmes = []Programme{}
	}
	respond.JSON(w, http.StatusOK, programmes)
}

func (h *Handler) HandleLinkSpace(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	var input LinkSpaceInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}
	ps, err := h.svc.LinkSpace(r.Context(), tenantID, id, input)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusCreated, ps)
}

func (h *Handler) HandleUnlinkSpace(w http.ResponseWriter, r *http.Request) {
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
	spaceID, err := uuid.Parse(r.PathValue("spaceId"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid space id"))
		return
	}
	if err := h.svc.UnlinkSpace(r.Context(), tenantID, programmeID, spaceID); err != nil {
		respond.Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
