package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Resolver maps Clerk external auth IDs to local tenant + user records.
type Resolver struct {
	db *pgxpool.Pool
}

// NewResolver creates a new Resolver backed by the given database pool.
func NewResolver(db *pgxpool.Pool) *Resolver {
	return &Resolver{db: db}
}

// Resolve looks up a local user by external_auth_id. If not found, creates
// a new tenant and user (first-login auto-provisioning). Returns enriched
// Claims with UserID, TenantID, and Role populated.
//
// If claims.ExternalAuthID is empty, the claims are returned unchanged (this
// is the DevVerifier path which already has UserID/TenantID set).
func (r *Resolver) Resolve(ctx context.Context, claims *Claims) (*Claims, error) {
	if claims.ExternalAuthID == "" {
		return claims, nil
	}

	const sel = `SELECT id, tenant_id, role FROM users WHERE external_auth_id = $1`
	var userID, tenantID uuid.UUID
	var role string
	err := r.db.QueryRow(ctx, sel, claims.ExternalAuthID).Scan(&userID, &tenantID, &role)
	if err == nil {
		claims.UserID = userID
		claims.TenantID = tenantID
		claims.Role = role
		return claims, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// First login — create tenant + user in a transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Use last 8 chars of the clerk user id for the slug so multiple first-logins
	// don't collide on the tenants_slug_key unique constraint.
	suffix := claims.ExternalAuthID
	if len(suffix) > 8 {
		suffix = suffix[len(suffix)-8:]
	}
	slug := "org-" + suffix

	orgName := claims.Email
	if orgName == "" {
		orgName = "My Workspace"
	}
	if err := tx.QueryRow(ctx,
		`INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
		orgName, slug,
	).Scan(&tenantID); err != nil {
		return nil, err
	}

	userName := claims.Email
	if userName == "" {
		userName = "User"
	}
	if err := tx.QueryRow(ctx,
		`INSERT INTO users (tenant_id, external_auth_id, email, name, role)
		 VALUES ($1, $2, $3, $4, 'owner') RETURNING id, role`,
		tenantID, claims.ExternalAuthID, claims.Email, userName,
	).Scan(&userID, &role); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	claims.UserID = userID
	claims.TenantID = tenantID
	claims.Role = role
	return claims, nil
}
