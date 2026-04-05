package spaces

import (
	"context"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/activity"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/realtime"
)

// Service implements business logic for spaces.
type Service struct {
	repo     Repository
	bus      *realtime.Bus
	activity *activity.Repository
}

// NewService creates a new Service.
// bus and activityRepo may be nil — event publishing and activity logging are
// skipped when they are.
func NewService(repo Repository, bus *realtime.Bus, activityRepo *activity.Repository) *Service {
	return &Service{repo: repo, bus: bus, activity: activityRepo}
}

// Create validates input, computes the materialized path, and creates the space.
// For root spaces, the path is "/".
// For nested spaces, the path is parent.Path + newID + "/". Since the ID is
// assigned by the database, the service calls Create first (with a placeholder
// path), then calls Update to set the final path using the returned ID.
func (s *Service) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput) (*Space, error) {
	if input.Name == "" {
		return nil, errors.Validation("name is required")
	}
	if input.Slug == "" {
		return nil, errors.Validation("slug is required")
	}

	if input.ParentSpaceID == nil {
		// Root space: path is always "/" and is known before insertion.
		return s.repo.Create(ctx, tenantID, ownerID, input, "/")
	}

	// Nested space: fetch parent to determine path prefix.
	parent, err := s.repo.GetByID(ctx, tenantID, *input.ParentSpaceID)
	if err != nil {
		return nil, err
	}

	// Insert with a temporary placeholder path; real path requires the new ID.
	created, err := s.repo.Create(ctx, tenantID, ownerID, input, parent.Path)
	if err != nil {
		return nil, err
	}

	// Compute the final materialized path: parent.Path + newID + "/"
	finalPath := parent.Path + created.ID.String() + "/"
	updated, err := s.repo.Update(ctx, tenantID, created.ID, UpdateInput{Path: &finalPath})
	if err != nil {
		return nil, err
	}

	return updated, nil
}

// GetByID retrieves a space by ID within the tenant.
func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Space, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// Update partially updates a space.
func (s *Service) Update(ctx context.Context, tenantID, id, actorID uuid.UUID, input UpdateInput) (*Space, error) {
	space, err := s.repo.Update(ctx, tenantID, id, input)
	if err != nil {
		return nil, err
	}
	if s.bus != nil && space != nil {
		_ = s.bus.Publish(ctx, space.TenantID, space.ID, actorID, realtime.EventSpaceUpdated, space)
	}
	if s.activity != nil && space != nil {
		_ = s.activity.Log(ctx, space.TenantID, space.ID, actorID, "space", "updated", space)
	}
	return space, nil
}

// Delete removes a space.
func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.repo.Delete(ctx, tenantID, id)
}

// ListRoots returns all root-level spaces for a tenant.
func (s *Service) ListRoots(ctx context.Context, tenantID uuid.UUID) ([]Space, error) {
	return s.repo.ListRoots(ctx, tenantID)
}

// ListAll returns every space in the tenant (for tree rendering).
func (s *Service) ListAll(ctx context.Context, tenantID uuid.UUID) ([]Space, error) {
	return s.repo.ListAll(ctx, tenantID)
}

// GetTree returns a root space and all its descendants as a tree.
func (s *Service) GetTree(ctx context.Context, tenantID, id uuid.UUID) (*TreeNode, error) {
	root, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	subtree, err := s.repo.GetSubtree(ctx, tenantID, root.Path)
	if err != nil {
		return nil, err
	}

	return buildTree(root, subtree), nil
}

// buildTree constructs a TreeNode hierarchy from a flat list of spaces.
// It groups spaces by parent_space_id and recursively builds the tree.
func buildTree(root *Space, all []Space) *TreeNode {
	childMap := make(map[uuid.UUID][]Space)
	for _, sp := range all {
		if sp.ID == root.ID {
			continue
		}
		if sp.ParentSpaceID != nil {
			childMap[*sp.ParentSpaceID] = append(childMap[*sp.ParentSpaceID], sp)
		}
	}
	return buildNode(*root, childMap)
}

func buildNode(space Space, childMap map[uuid.UUID][]Space) *TreeNode {
	node := &TreeNode{Space: space}
	for _, child := range childMap[space.ID] {
		childNode := buildNode(child, childMap)
		node.Children = append(node.Children, *childNode)
	}
	return node
}
