package tenant_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWithTenantID_FromContext_Roundtrip(t *testing.T) {
	id := uuid.New()
	ctx := tenant.WithTenantID(context.Background(), id)

	got, err := tenant.FromContext(ctx)
	require.NoError(t, err)
	assert.Equal(t, id, got)
}

func TestFromContext_EmptyContext_ReturnsError(t *testing.T) {
	_, err := tenant.FromContext(context.Background())
	require.Error(t, err)
	assert.True(t, errors.IsUnauthorized(err))
}
