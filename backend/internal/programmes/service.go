package programmes

import (
	"context"

	"github.com/google/uuid"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput) (*Programme, error) {
	if input.Name == "" {
		return nil, domainerrors.Validation("name is required")
	}
	return s.repo.Create(ctx, tenantID, ownerID, input)
}

func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Programme, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Programme, error) {
	if input.Status != nil {
		switch *input.Status {
		case "active", "paused", "completed":
		default:
			return nil, domainerrors.Validation("status must be active, paused, or completed")
		}
	}
	return s.repo.Update(ctx, tenantID, id, input)
}

func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *Service) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Programme, error) {
	return s.repo.ListByTenant(ctx, tenantID)
}

func (s *Service) LinkSpace(ctx context.Context, tenantID, programmeID uuid.UUID, input LinkSpaceInput) (*ProgrammeSpace, error) {
	if input.SpaceID == uuid.Nil {
		return nil, domainerrors.Validation("space_id is required")
	}
	role := input.Role
	if role == "" {
		role = "contributes"
	}
	if role != "owns" && role != "contributes" {
		return nil, domainerrors.Validation("role must be 'owns' or 'contributes'")
	}
	return s.repo.LinkSpace(ctx, tenantID, programmeID, input.SpaceID, role)
}

func (s *Service) UnlinkSpace(ctx context.Context, tenantID, programmeID, spaceID uuid.UUID) error {
	return s.repo.UnlinkSpace(ctx, tenantID, programmeID, spaceID)
}

func (s *Service) ListSpaces(ctx context.Context, tenantID, programmeID uuid.UUID) ([]ProgrammeSpace, error) {
	return s.repo.ListSpaces(ctx, tenantID, programmeID)
}
