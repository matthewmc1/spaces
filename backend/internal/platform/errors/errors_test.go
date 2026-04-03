package errors_test

import (
	"fmt"
	"testing"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNotFound(t *testing.T) {
	err := errors.NotFound("space", "abc-123")
	require.NotNil(t, err)
	assert.Equal(t, "space not found: abc-123", err.Error())
	assert.True(t, errors.IsNotFound(err))
	assert.False(t, errors.IsConflict(err))
	assert.False(t, errors.IsValidation(err))
	assert.False(t, errors.IsForbidden(err))
	assert.False(t, errors.IsUnauthorized(err))
}

func TestConflict(t *testing.T) {
	err := errors.Conflict("slug already exists")
	require.NotNil(t, err)
	assert.Equal(t, "conflict: slug already exists", err.Error())
	assert.True(t, errors.IsConflict(err))
	assert.False(t, errors.IsNotFound(err))
	assert.False(t, errors.IsValidation(err))
	assert.False(t, errors.IsForbidden(err))
	assert.False(t, errors.IsUnauthorized(err))
}

func TestValidation(t *testing.T) {
	err := errors.Validation("title is required")
	require.NotNil(t, err)
	assert.Equal(t, "validation: title is required", err.Error())
	assert.True(t, errors.IsValidation(err))
	assert.False(t, errors.IsNotFound(err))
	assert.False(t, errors.IsConflict(err))
	assert.False(t, errors.IsForbidden(err))
	assert.False(t, errors.IsUnauthorized(err))
}

func TestForbidden(t *testing.T) {
	err := errors.Forbidden("access denied")
	require.NotNil(t, err)
	assert.Equal(t, "forbidden: access denied", err.Error())
	assert.True(t, errors.IsForbidden(err))
	assert.False(t, errors.IsNotFound(err))
	assert.False(t, errors.IsConflict(err))
	assert.False(t, errors.IsValidation(err))
	assert.False(t, errors.IsUnauthorized(err))
}

func TestUnauthorized(t *testing.T) {
	err := errors.Unauthorized("missing token")
	require.NotNil(t, err)
	assert.Equal(t, "unauthorized: missing token", err.Error())
	assert.True(t, errors.IsUnauthorized(err))
	assert.False(t, errors.IsNotFound(err))
	assert.False(t, errors.IsConflict(err))
	assert.False(t, errors.IsValidation(err))
	assert.False(t, errors.IsForbidden(err))
}

func TestIsHelpers_WithNonDomainError(t *testing.T) {
	// stdlib errors should not match any Is* helpers
	stdErr := fmt.Errorf("some standard error")
	assert.False(t, errors.IsNotFound(stdErr))
	assert.False(t, errors.IsConflict(stdErr))
	assert.False(t, errors.IsValidation(stdErr))
	assert.False(t, errors.IsForbidden(stdErr))
	assert.False(t, errors.IsUnauthorized(stdErr))
}
