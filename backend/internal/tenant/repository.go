package tenant

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	platformerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// Repository provides database access for tenants.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new tenant Repository.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetByID retrieves a tenant by its UUID.
// Returns errors.NotFound if the tenant does not exist.
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	const q = `
		SELECT id, name, slug, plan, created_at, updated_at
		FROM tenants
		WHERE id = $1`

	row := r.db.QueryRow(ctx, q, id)
	t, err := scanTenant(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, platformerrors.NotFound("tenant", id.String())
		}
		return nil, err
	}
	return t, nil
}

// GetBySlug retrieves a tenant by its slug.
// Returns errors.NotFound if the tenant does not exist.
func (r *Repository) GetBySlug(ctx context.Context, slug string) (*Tenant, error) {
	const q = `
		SELECT id, name, slug, plan, created_at, updated_at
		FROM tenants
		WHERE slug = $1`

	row := r.db.QueryRow(ctx, q, slug)
	t, err := scanTenant(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, platformerrors.NotFound("tenant", slug)
		}
		return nil, err
	}
	return t, nil
}

func scanTenant(row pgx.Row) (*Tenant, error) {
	var t Tenant
	err := row.Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
