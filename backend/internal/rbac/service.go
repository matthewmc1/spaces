package rbac

import (
	"context"

	"github.com/google/uuid"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// Service implements business logic for role-based access control.
type Service struct {
	repo Repository
}

// NewService creates a new Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// CheckPermission verifies that userID has at least requiredRole in the given
// tenant/space context. Returns a Forbidden error if the check fails.
func (s *Service) CheckPermission(ctx context.Context, tenantID, userID uuid.UUID, spaceID *uuid.UUID, requiredRole string) error {
	role, err := s.repo.GetRole(ctx, tenantID, userID, spaceID)
	if err != nil {
		return err
	}
	if !HasAtLeast(role, requiredRole) {
		return domainerrors.Forbidden("insufficient permissions")
	}
	return nil
}

// Assign creates or updates a role assignment.
func (s *Service) Assign(ctx context.Context, tenantID, userID uuid.UUID, spaceID *uuid.UUID, role string) (*RoleAssignment, error) {
	return s.repo.Assign(ctx, tenantID, userID, spaceID, role)
}

// Revoke removes a role assignment by ID.
func (s *Service) Revoke(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.repo.Revoke(ctx, tenantID, id)
}

// ListBySpace returns all role assignments for the given space.
func (s *Service) ListBySpace(ctx context.Context, tenantID uuid.UUID, spaceID *uuid.UUID) ([]RoleAssignment, error) {
	return s.repo.ListBySpace(ctx, tenantID, spaceID)
}
