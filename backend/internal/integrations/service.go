package integrations

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

func (s *Service) Create(ctx context.Context, tenantID, createdBy uuid.UUID, input CreateInput) (*Integration, error) {
	if input.Provider == "" {
		return nil, domainerrors.Validation("provider is required")
	}
	if input.Provider != "github" && input.Provider != "gitlab" {
		return nil, domainerrors.Validation("provider must be 'github' or 'gitlab'")
	}
	if input.Name == "" {
		return nil, domainerrors.Validation("name is required")
	}
	return s.repo.Create(ctx, tenantID, createdBy, input)
}

func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Integration, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *Service) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Integration, error) {
	return s.repo.ListByTenant(ctx, tenantID)
}

func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Integration, error) {
	if input.Status != nil {
		switch *input.Status {
		case "active", "inactive", "error":
		default:
			return nil, domainerrors.Validation("status must be active, inactive, or error")
		}
	}
	return s.repo.Update(ctx, tenantID, id, input)
}

func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *Service) GetByProvider(ctx context.Context, tenantID uuid.UUID, provider string) (*Integration, error) {
	return s.repo.GetByProvider(ctx, tenantID, provider)
}

func (s *Service) CreateCardLink(ctx context.Context, tenantID, cardID uuid.UUID, input CreateCardLinkInput) (*CardLink, error) {
	if input.IntegrationID == uuid.Nil {
		return nil, domainerrors.Validation("integration_id is required")
	}
	validTypes := map[string]bool{
		"pull_request": true, "issue": true, "branch": true, "build": true, "commit": true,
	}
	if !validTypes[input.ExternalType] {
		return nil, domainerrors.Validation("external_type must be pull_request, issue, branch, build, or commit")
	}
	if input.ExternalID == "" || input.ExternalURL == "" {
		return nil, domainerrors.Validation("external_id and external_url are required")
	}
	return s.repo.CreateCardLink(ctx, tenantID, cardID, input)
}

func (s *Service) DeleteCardLink(ctx context.Context, tenantID, linkID uuid.UUID) error {
	return s.repo.DeleteCardLink(ctx, tenantID, linkID)
}

func (s *Service) ListByCard(ctx context.Context, tenantID, cardID uuid.UUID) ([]CardLink, error) {
	return s.repo.ListByCard(ctx, tenantID, cardID)
}
