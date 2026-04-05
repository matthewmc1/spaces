package cards

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/activity"
	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
	"github.com/matthewmcgibbon/spaces/backend/internal/realtime"
)

// Service handles business logic for cards.
type Service struct {
	repo     Repository
	bus      *realtime.Bus
	activity *activity.Repository
}

// NewService creates a new Service with the given Repository.
// bus and activityRepo may be nil — event publishing and activity logging are
// skipped when they are.
func NewService(repo Repository, bus *realtime.Bus, activityRepo *activity.Repository) *Service {
	return &Service{repo: repo, bus: bus, activity: activityRepo}
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
	if s.activity != nil && card != nil {
		_ = s.activity.Log(ctx, card.TenantID, card.ID, createdBy, "card", "created", card)
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
	if s.activity != nil && card != nil {
		_ = s.activity.Log(ctx, card.TenantID, card.ID, actorID, "card", "updated", card)
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
	if s.activity != nil && moved != nil {
		_ = s.activity.Log(ctx, moved.TenantID, moved.ID, actorID, "card", "moved", map[string]any{
			"from_column": card.ColumnName,
			"to_column":   moved.ColumnName,
		})
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
	if s.activity != nil && card != nil {
		_ = s.activity.Log(ctx, card.TenantID, card.ID, actorID, "card", "deleted", map[string]any{"id": id})
	}
	return nil
}

// ListBySpace delegates to the repository.
func (s *Service) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID, filters ListFilters, page pagination.Params) ([]Card, string, error) {
	return s.repo.ListBySpace(ctx, tenantID, spaceID, filters, page)
}
