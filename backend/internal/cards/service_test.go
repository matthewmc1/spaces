package cards

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
)

// mockRepository is a test double for Repository.
type mockRepository struct {
	createFn     func(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Card, error)
	getByIDFn    func(ctx context.Context, tenantID, id uuid.UUID) (*Card, error)
	updateFn     func(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Card, error)
	moveFn       func(ctx context.Context, tenantID, id uuid.UUID, column Column, position float64) (*Card, error)
	deleteFn     func(ctx context.Context, tenantID, id uuid.UUID) error
	listBySpaceFn func(ctx context.Context, tenantID, spaceID uuid.UUID, filters ListFilters, page pagination.Params) ([]Card, string, error)
}

func (m *mockRepository) Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Card, error) {
	return m.createFn(ctx, tenantID, spaceID, createdBy, input)
}

func (m *mockRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Card, error) {
	return m.getByIDFn(ctx, tenantID, id)
}

func (m *mockRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Card, error) {
	return m.updateFn(ctx, tenantID, id, input)
}

func (m *mockRepository) Move(ctx context.Context, tenantID, id uuid.UUID, column Column, position float64) (*Card, error) {
	return m.moveFn(ctx, tenantID, id, column, position)
}

func (m *mockRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return m.deleteFn(ctx, tenantID, id)
}

func (m *mockRepository) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID, filters ListFilters, page pagination.Params) ([]Card, string, error) {
	return m.listBySpaceFn(ctx, tenantID, spaceID, filters, page)
}

func TestService_Move_ValidTransition(t *testing.T) {
	tenantID := uuid.New()
	cardID := uuid.New()
	spaceID := uuid.New()

	existingCard := &Card{
		ID:         cardID,
		SpaceID:    spaceID,
		TenantID:   tenantID,
		Title:      "Test card",
		ColumnName: ColumnInbox,
		Position:   1000,
		Labels:     []string{},
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		MovedAt:    time.Now(),
	}

	movedCard := *existingCard
	movedCard.ColumnName = ColumnIcebox
	movedCard.Position = 2000

	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, tid, id uuid.UUID) (*Card, error) {
			return existingCard, nil
		},
		moveFn: func(ctx context.Context, tid, id uuid.UUID, col Column, pos float64) (*Card, error) {
			assert.Equal(t, ColumnIcebox, col)
			assert.Equal(t, float64(2000), pos)
			return &movedCard, nil
		},
	}

	svc := NewService(mock, nil)
	result, err := svc.Move(context.Background(), tenantID, cardID, uuid.Nil, MoveInput{
		Column:   ColumnIcebox,
		Position: 2000,
	})

	require.NoError(t, err)
	assert.Equal(t, ColumnIcebox, result.ColumnName)
}

func TestService_Move_InvalidTransition(t *testing.T) {
	tenantID := uuid.New()
	cardID := uuid.New()
	spaceID := uuid.New()

	existingCard := &Card{
		ID:         cardID,
		SpaceID:    spaceID,
		TenantID:   tenantID,
		Title:      "Test card",
		ColumnName: ColumnInbox,
		Position:   1000,
		Labels:     []string{},
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		MovedAt:    time.Now(),
	}

	mock := &mockRepository{
		getByIDFn: func(ctx context.Context, tid, id uuid.UUID) (*Card, error) {
			return existingCard, nil
		},
		moveFn: func(ctx context.Context, tid, id uuid.UUID, col Column, pos float64) (*Card, error) {
			t.Fatal("Move should not be called for invalid transition")
			return nil, nil
		},
	}

	svc := NewService(mock, nil)
	result, err := svc.Move(context.Background(), tenantID, cardID, uuid.Nil, MoveInput{
		Column:   ColumnDone,
		Position: 1000,
	})

	require.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, domainerrors.IsValidation(err), "expected validation error, got: %v", err)
}

func TestService_Create_MissingTitle(t *testing.T) {
	mock := &mockRepository{
		createFn: func(ctx context.Context, tid, sid, cid uuid.UUID, input CreateInput) (*Card, error) {
			t.Fatal("Create should not be called with empty title")
			return nil, nil
		},
	}

	svc := NewService(mock, nil)
	result, err := svc.Create(context.Background(), uuid.New(), uuid.New(), uuid.New(), CreateInput{
		Title: "",
	})

	require.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, domainerrors.IsValidation(err), "expected validation error, got: %v", err)
}
