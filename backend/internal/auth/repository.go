package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	platformerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// Repository provides database access for auth users.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new auth Repository.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetByExternalID retrieves a user by their external auth provider ID.
// Returns errors.NotFound if the user does not exist.
func (r *Repository) GetByExternalID(ctx context.Context, externalID string) (*User, error) {
	const q = `
		SELECT id, tenant_id, external_auth_id, email, name, COALESCE(avatar_url, ''), role, created_at
		FROM users
		WHERE external_auth_id = $1`

	row := r.db.QueryRow(ctx, q, externalID)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, platformerrors.NotFound("user", externalID)
		}
		return nil, err
	}
	return u, nil
}

// GetByID retrieves a user by tenant ID and user ID.
// Returns errors.NotFound if the user does not exist.
func (r *Repository) GetByID(ctx context.Context, tenantID, userID uuid.UUID) (*User, error) {
	const q = `
		SELECT id, tenant_id, external_auth_id, email, name, COALESCE(avatar_url, ''), role, created_at
		FROM users
		WHERE tenant_id = $1 AND id = $2`

	row := r.db.QueryRow(ctx, q, tenantID, userID)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, platformerrors.NotFound("user", userID.String())
		}
		return nil, err
	}
	return u, nil
}

func scanUser(row pgx.Row) (*User, error) {
	var u User
	err := row.Scan(
		&u.ID,
		&u.TenantID,
		&u.ExternalAuthID,
		&u.Email,
		&u.Name,
		&u.AvatarURL,
		&u.Role,
		&u.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}
