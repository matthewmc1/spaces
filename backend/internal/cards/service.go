package cards

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
	"github.com/matthewmcgibbon/spaces/backend/internal/realtime"
)

// Service handles business logic for cards.
type Service struct {
	repo Repository
	bus  *realtime.Bus
}

// NewService creates a new Service with the given Repository.
// bus may be nil — event publishing is skipped when it is.
func NewService(repo Repository, bus *realtime.Bus) *Service {
	return &Service{repo: repo, bus: bus}
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
	if s.bus != nil && card != nil {
		_ = s.bus.Publish(ctx, card.TenantID, card.SpaceID, createdBy, realtime.EventCardCreated, card)
	}
	return card, nil
}

// GetByID retrieves a card by ID.
func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Card, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// Update delegates to the repository.
func (s *Service) Update(ctx context.Context, tenantID, id, actorID uuid.UUID, input UpdateInput) (*Card, error) {
	card, err := s.repo.Update(ctx, tenantID, id, input)
	if err != nil {
		return nil, err
	}
	if s.bus != nil && card != nil {
		_ = s.bus.Publish(ctx, card.TenantID, card.SpaceID, actorID, realtime.EventCardUpdated, card)
	}
	return card, nil
}

// Move fetches the card, validates the column transition, then delegates to the repository.
func (s *Service) Move(ctx context.Context, tenantID, id, actorID uuid.UUID, input MoveInput) (*Card, error) {
	card, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	if err := ValidateTransition(card.ColumnName, input.Column); err != nil {
		return nil, err
	}

	moved, err := s.repo.Move(ctx, tenantID, id, input.Column, input.Position)
	if err != nil {
		return nil, err
	}
	if s.bus != nil && moved != nil {
		_ = s.bus.Publish(ctx, moved.TenantID, moved.SpaceID, actorID, realtime.EventCardMoved, moved)
	}
	return moved, nil
}

// Delete delegates to the repository.
func (s *Service) Delete(ctx context.Context, tenantID, id, actorID uuid.UUID) error {
	// Fetch first to capture spaceID for the event channel before deleting.
	card, _ := s.repo.GetByID(ctx, tenantID, id)

	if err := s.repo.Delete(ctx, tenantID, id); err != nil {
		return err
	}
	if s.bus != nil && card != nil {
		_ = s.bus.Publish(ctx, card.TenantID, card.SpaceID, actorID, realtime.EventCardDeleted, map[string]any{"id": id})
	}
	return nil
}

// ListBySpace delegates to the repository.
func (s *Service) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID, filters ListFilters, page pagination.Params) ([]Card, string, error) {
	return s.repo.ListBySpace(ctx, tenantID, spaceID, filters, page)
}
