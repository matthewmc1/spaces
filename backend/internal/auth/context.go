package auth

import (
	"context"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type ctxKey struct{}

// WithClaims returns a new context with the given claims stored.
func WithClaims(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, ctxKey{}, claims)
}

// FromContext retrieves the Claims from the context.
// Returns errors.Unauthorized if not present.
func FromContext(ctx context.Context) (*Claims, error) {
	claims, ok := ctx.Value(ctxKey{}).(*Claims)
	if !ok || claims == nil {
		return nil, errors.Unauthorized("auth claims not found in context")
	}
	return claims, nil
}
