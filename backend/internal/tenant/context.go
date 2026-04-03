package tenant

import (
	"context"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type ctxKey struct{}

// WithTenantID returns a new context with the given tenant ID stored.
func WithTenantID(ctx context.Context, tenantID uuid.UUID) context.Context {
	return context.WithValue(ctx, ctxKey{}, tenantID)
}

// FromContext retrieves the tenant ID from the context.
// Returns errors.Unauthorized if not present.
func FromContext(ctx context.Context) (uuid.UUID, error) {
	id, ok := ctx.Value(ctxKey{}).(uuid.UUID)
	if !ok {
		return uuid.Nil, errors.Unauthorized("tenant not found in context")
	}
	return id, nil
}
