package spaces_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/matthewmcgibbon/spaces/backend/internal/spaces"
)

// mockRepository is a testify mock for spaces.Repository.
type mockRepository struct {
	mock.Mock
}

func (m *mockRepository) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input spaces.CreateInput, path string) (*spaces.Space, error) {
	args := m.Called(ctx, tenantID, ownerID, input, path)
	if s, ok := args.Get(0).(*spaces.Space); ok {
		return s, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*spaces.Space, error) {
	args := m.Called(ctx, tenantID, id)
	if s, ok := args.Get(0).(*spaces.Space); ok {
		return s, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input spaces.UpdateInput) (*spaces.Space, error) {
	args := m.Called(ctx, tenantID, id, input)
	if s, ok := args.Get(0).(*spaces.Space); ok {
		return s, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	args := m.Called(ctx, tenantID, id)
	return args.Error(0)
}

func (m *mockRepository) ListRoots(ctx context.Context, tenantID uuid.UUID) ([]spaces.Space, error) {
	args := m.Called(ctx, tenantID)
	if s, ok := args.Get(0).([]spaces.Space); ok {
		return s, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockRepository) ListChildren(ctx context.Context, tenantID, parentID uuid.UUID) ([]spaces.Space, error) {
	args := m.Called(ctx, tenantID, parentID)
	if s, ok := args.Get(0).([]spaces.Space); ok {
		return s, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockRepository) ListAll(ctx context.Context, tenantID uuid.UUID) ([]spaces.Space, error) {
	args := m.Called(ctx, tenantID)
	if s, ok := args.Get(0).([]spaces.Space); ok {
		return s, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockRepository) GetSubtree(ctx context.Context, tenantID uuid.UUID, rootPath string) ([]spaces.Space, error) {
	args := m.Called(ctx, tenantID, rootPath)
	if s, ok := args.Get(0).([]spaces.Space); ok {
		return s, args.Error(1)
	}
	return nil, args.Error(1)
}

func TestService_Create_RootSpace(t *testing.T) {
	repo := &mockRepository{}
	svc := spaces.NewService(repo, nil, nil)

	tenantID := uuid.New()
	ownerID := uuid.New()
	newID := uuid.New()

	input := spaces.CreateInput{
		Name:       "Engineering",
		Slug:       "engineering",
		Visibility: "public",
	}

	// For a root space, path is always "/"
	created := &spaces.Space{
		ID:       newID,
		TenantID: tenantID,
		Name:     input.Name,
		Slug:     input.Slug,
		Path:     "/",
		OwnerID:  ownerID,
	}

	repo.On("Create", mock.Anything, tenantID, ownerID, input, "/").Return(created, nil)

	result, err := svc.Create(context.Background(), tenantID, ownerID, input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "/", result.Path)
	assert.Equal(t, newID, result.ID)

	repo.AssertExpectations(t)
}

func TestService_Create_NestedSpace(t *testing.T) {
	repo := &mockRepository{}
	svc := spaces.NewService(repo, nil, nil)

	tenantID := uuid.New()
	ownerID := uuid.New()
	parentID := uuid.New()
	newID := uuid.New()

	parent := &spaces.Space{
		ID:       parentID,
		TenantID: tenantID,
		Path:     "/",
		Name:     "Engineering",
		Slug:     "engineering",
	}

	input := spaces.CreateInput{
		ParentSpaceID: &parentID,
		Name:          "Backend",
		Slug:          "backend",
		Visibility:    "public",
	}

	// The service:
	// 1. Calls GetByID to fetch parent
	// 2. Calls Create with a placeholder path (parent.Path)
	// 3. Calls Update with the final path: parent.Path + created.ID + "/"
	repo.On("GetByID", mock.Anything, tenantID, parentID).Return(parent, nil)

	// Create returns a space with the DB-assigned newID; path is the placeholder
	created := &spaces.Space{
		ID:            newID,
		TenantID:      tenantID,
		ParentSpaceID: &parentID,
		Name:          input.Name,
		Slug:          input.Slug,
		Path:          parent.Path, // placeholder path
		OwnerID:       ownerID,
	}
	repo.On("Create", mock.Anything, tenantID, ownerID, input, parent.Path).Return(created, nil)

	// Update sets the final path = parent.Path + newID + "/"
	finalPath := "/" + newID.String() + "/"
	updated := &spaces.Space{
		ID:            newID,
		TenantID:      tenantID,
		ParentSpaceID: &parentID,
		Name:          input.Name,
		Slug:          input.Slug,
		Path:          finalPath,
		OwnerID:       ownerID,
	}
	repo.On("Update", mock.Anything, tenantID, newID, spaces.UpdateInput{Path: &finalPath}).Return(updated, nil)

	result, err := svc.Create(context.Background(), tenantID, ownerID, input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, finalPath, result.Path)

	repo.AssertExpectations(t)
}

func TestService_Create_MissingName(t *testing.T) {
	repo := &mockRepository{}
	svc := spaces.NewService(repo, nil, nil)

	tenantID := uuid.New()
	ownerID := uuid.New()

	input := spaces.CreateInput{
		Slug: "engineering",
	}

	result, err := svc.Create(context.Background(), tenantID, ownerID, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "name")

	repo.AssertNotCalled(t, "Create")
}

func TestService_Create_MissingSlug(t *testing.T) {
	repo := &mockRepository{}
	svc := spaces.NewService(repo, nil, nil)

	tenantID := uuid.New()
	ownerID := uuid.New()

	input := spaces.CreateInput{
		Name: "Engineering",
	}

	result, err := svc.Create(context.Background(), tenantID, ownerID, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "slug")

	repo.AssertNotCalled(t, "Create")
}
