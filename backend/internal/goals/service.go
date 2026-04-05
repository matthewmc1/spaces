package goals

import (
	"context"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/realtime"
)

// Service provides business logic for the goals domain.
type Service struct {
	repo Repository
	bus  *realtime.Bus
}

// NewService creates a new Service with the given Repository.
// bus may be nil — event publishing is skipped when it is.
func NewService(repo Repository, bus *realtime.Bus) *Service {
	return &Service{repo: repo, bus: bus}
}

// Create validates input and creates a new goal.
func (s *Service) Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Goal, error) {
	if input.Title == "" {
		return nil, errors.Validation("title is required")
	}
	goal, err := s.repo.Create(ctx, tenantID, spaceID, createdBy, input)
	if err != nil {
		return nil, err
	}
	if s.bus != nil && goal != nil {
		_ = s.bus.Publish(ctx, goal.TenantID, goal.SpaceID, createdBy, realtime.EventGoalCreated, goal)
	}
	return goal, nil
}

// GetByID retrieves a goal by ID.
func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Goal, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// Update validates input and updates an existing goal.
func (s *Service) Update(ctx context.Context, tenantID, id, actorID uuid.UUID, input UpdateInput) (*Goal, error) {
	if input.Status != nil {
		switch *input.Status {
		case "active", "achieved", "abandoned":
			// valid
		default:
			return nil, errors.Validation("status must be one of: active, achieved, abandoned")
		}
	}
	goal, err := s.repo.Update(ctx, tenantID, id, input)
	if err != nil {
		return nil, err
	}
	if s.bus != nil && goal != nil {
		_ = s.bus.Publish(ctx, goal.TenantID, goal.SpaceID, actorID, realtime.EventGoalUpdated, goal)
	}
	return goal, nil
}

// Delete removes a goal by ID.
func (s *Service) Delete(ctx context.Context, tenantID, id, actorID uuid.UUID) error {
	// Fetch first to capture spaceID for the event channel before deleting.
	goal, _ := s.repo.GetByID(ctx, tenantID, id)

	if err := s.repo.Delete(ctx, tenantID, id); err != nil {
		return err
	}
	if s.bus != nil && goal != nil {
		_ = s.bus.Publish(ctx, goal.TenantID, goal.SpaceID, actorID, realtime.EventGoalDeleted, map[string]any{"id": id})
	}
	return nil
}

// ListBySpace returns all goals for a given space.
func (s *Service) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID) ([]Goal, error) {
	return s.repo.ListBySpace(ctx, tenantID, spaceID)
}

// CreateLink validates input and creates a goal link.
func (s *Service) CreateLink(ctx context.Context, tenantID, goalID uuid.UUID, input CreateLinkInput) (*GoalLink, error) {
	switch input.SourceType {
	case "card", "goal":
		// valid
	default:
		return nil, errors.Validation("source_type must be 'card' or 'goal'")
	}
	if input.SourceID == uuid.Nil {
		return nil, errors.Validation("source_id is required")
	}
	return s.repo.CreateLink(ctx, tenantID, goalID, input)
}

// DeleteLink removes a goal link by ID.
func (s *Service) DeleteLink(ctx context.Context, tenantID, linkID uuid.UUID) error {
	return s.repo.DeleteLink(ctx, tenantID, linkID)
}

// ListLinksByGoal returns all links for a given goal.
func (s *Service) ListLinksByGoal(ctx context.Context, tenantID, goalID uuid.UUID) ([]GoalLink, error) {
	return s.repo.ListLinksByGoal(ctx, tenantID, goalID)
}

// CountLinkedCards returns the count of linked and total in-flight cards for a space.
func (s *Service) CountLinkedCards(ctx context.Context, tenantID, spaceID uuid.UUID) (linked int, total int, err error) {
	return s.repo.CountLinkedCards(ctx, tenantID, spaceID)
}
