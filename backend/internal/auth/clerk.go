package auth

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// ClerkVerifier validates Clerk session JWTs via Clerk's JWKS endpoint.
type ClerkVerifier struct {
	jwks keyfunc.Keyfunc
}

// NewClerkVerifier derives the JWKS URL from the publishable key and fetches
// the key set. The publishable key encodes the Clerk frontend API domain as
// base64 in the portion after "pk_test_" or "pk_live_".
func NewClerkVerifier(ctx context.Context, publishableKey string) (*ClerkVerifier, error) {
	if publishableKey == "" {
		return nil, fmt.Errorf("clerk publishable key is empty")
	}

	domain, err := clerkDomainFromPublishableKey(publishableKey)
	if err != nil {
		return nil, err
	}

	jwksURL := "https://" + domain + "/.well-known/jwks.json"
	jwks, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch clerk jwks: %w", err)
	}

	return &ClerkVerifier{jwks: jwks}, nil
}

// clerkDomainFromPublishableKey decodes the base64 domain from a Clerk
// publishable key of the form "pk_test_<base64>" or "pk_live_<base64>".
// The decoded value has a trailing "$" that must be removed.
func clerkDomainFromPublishableKey(key string) (string, error) {
	var encoded string
	switch {
	case strings.HasPrefix(key, "pk_test_"):
		encoded = strings.TrimPrefix(key, "pk_test_")
	case strings.HasPrefix(key, "pk_live_"):
		encoded = strings.TrimPrefix(key, "pk_live_")
	default:
		return "", fmt.Errorf("invalid clerk publishable key prefix")
	}
	// Clerk publishable keys are base64 without padding — add padding if missing.
	if pad := len(encoded) % 4; pad != 0 {
		encoded += strings.Repeat("=", 4-pad)
	}
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("failed to decode publishable key: %w", err)
	}
	return strings.TrimSuffix(string(decoded), "$"), nil
}

// Verify validates the JWT signature via JWKS and extracts Claims.
// Clerk session tokens have the user ID in the "sub" claim.
// Returned Claims have ExternalAuthID set; the User/Tenant IDs are populated
// later by a resolver middleware (see auth.Resolver).
func (c *ClerkVerifier) Verify(ctx context.Context, token string) (*Claims, error) {
	parsed, err := jwt.Parse(token, c.jwks.Keyfunc)
	if err != nil {
		return nil, errors.Unauthorized("invalid clerk token: " + err.Error())
	}
	if !parsed.Valid {
		return nil, errors.Unauthorized("clerk token invalid")
	}

	mapClaims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.Unauthorized("clerk claims malformed")
	}

	sub, _ := mapClaims["sub"].(string)
	if sub == "" {
		return nil, errors.Unauthorized("clerk token missing sub claim")
	}

	email, _ := mapClaims["email"].(string)

	return &Claims{
		UserID:         uuid.Nil,
		TenantID:       uuid.Nil,
		ExternalAuthID: sub,
		Email:          email,
		Role:           "member",
	}, nil
}

// CompoundVerifier tries the DevVerifier for the literal "dev-token" value
// and delegates to the primary verifier for everything else. This allows a
// local dev path to keep working alongside a real Clerk verifier.
type CompoundVerifier struct {
	primary TokenVerifier
	dev     *DevVerifier
}

func NewCompoundVerifier(primary TokenVerifier, dev *DevVerifier) *CompoundVerifier {
	return &CompoundVerifier{primary: primary, dev: dev}
}

func (c *CompoundVerifier) Verify(ctx context.Context, token string) (*Claims, error) {
	if token == "dev-token" && c.dev != nil {
		return c.dev.Verify(ctx, token)
	}
	return c.primary.Verify(ctx, token)
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
