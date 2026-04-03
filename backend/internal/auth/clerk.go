package auth

import (
	"context"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// ClerkVerifier is a stub TokenVerifier that always returns an error.
// Replace with a real Clerk SDK integration when ready.
type ClerkVerifier struct{}

// NewClerkVerifier creates a new ClerkVerifier stub.
func NewClerkVerifier() *ClerkVerifier {
	return &ClerkVerifier{}
}

// Verify always returns an unauthorized error until Clerk is configured.
func (c *ClerkVerifier) Verify(_ context.Context, _ string) (*Claims, error) {
	return nil, errors.Unauthorized("clerk verification not yet configured")
}

// DevVerifier accepts any non-empty token and returns fixed claims.
// Intended for local development only — never use in production.
type DevVerifier struct {
	TenantID uuid.UUID
	UserID   uuid.UUID
	Email    string
	Role     string
}

// NewDevVerifier creates a DevVerifier with the provided tenant and user IDs.
func NewDevVerifier(tenantID, userID uuid.UUID) *DevVerifier {
	return &DevVerifier{
		TenantID: tenantID,
		UserID:   userID,
		Email:    "dev@localhost",
		Role:     "admin",
	}
}

// Verify returns fixed Claims for any non-empty token.
// Returns errors.Unauthorized if the token is empty.
func (d *DevVerifier) Verify(_ context.Context, token string) (*Claims, error) {
	if token == "" {
		return nil, errors.Unauthorized("dev verifier: empty token")
	}
	return &Claims{
		UserID:   d.UserID,
		TenantID: d.TenantID,
		Email:    d.Email,
		Role:     d.Role,
	}, nil
}
