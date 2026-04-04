package settings

import (
	"context"

	"github.com/google/uuid"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// Service implements business logic for user settings.
type Service struct {
	repo Repository
}

// NewService creates a new Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// Get retrieves (or lazily creates) settings for the given user.
func (s *Service) Get(ctx context.Context, tenantID, userID uuid.UUID) (*UserSettings, error) {
	return s.repo.GetOrCreate(ctx, tenantID, userID)
}

// Update validates input and updates settings for the given user.
func (s *Service) Update(ctx context.Context, tenantID, userID uuid.UUID, input UpdateInput) (*UserSettings, error) {
	if input.Theme != nil {
		switch *input.Theme {
		case "light", "dark", "system":
			// valid
		default:
			return nil, domainerrors.Validation("theme must be one of: light, dark, system")
		}
	}

	return s.repo.Update(ctx, tenantID, userID, input)
}
