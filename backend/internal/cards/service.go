package cards

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
)

// Service handles business logic for cards.
type Service struct {
	repo Repository
}

// NewService creates a new Service with the given Repository.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// Create validates the input and delegates to the repository.
func (s *Service) Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Card, error) {
	if input.Title == "" {
		return nil, domainerrors.Validation("title is required")
	}
	card, err := s.repo.Create(ctx, tenantID, spaceID, createdBy, input)
	if err != nil {
		slog.Error("card create failed", "error", err, "input", input)
		return nil, err
	}
	return card, nil
}

// GetByID retrieves a card by ID.
func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Card, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// Update delegates to the repository.
func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Card, error) {
	return s.repo.Update(ctx, tenantID, id, input)
}

// Move fetches the card, validates the column transition, then delegates to the repository.
func (s *Service) Move(ctx context.Context, tenantID, id uuid.UUID, input MoveInput) (*Card, error) {
	card, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	if err := ValidateTransition(card.ColumnName, input.Column); err != nil {
		return nil, err
	}

	return s.repo.Move(ctx, tenantID, id, input.Column, input.Position)
}

// Delete delegates to the repository.
func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.repo.Delete(ctx, tenantID, id)
}

// ListBySpace delegates to the repository.
func (s *Service) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID, filters ListFilters, page pagination.Params) ([]Card, string, error) {
	return s.repo.ListBySpace(ctx, tenantID, spaceID, filters, page)
}
