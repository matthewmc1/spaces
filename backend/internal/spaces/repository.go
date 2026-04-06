package spaces

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// Repository defines the data access interface for spaces.
type Repository interface {
	Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput, path string) (*Space, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Space, error)
	Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Space, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	ListAll(ctx context.Context, tenantID uuid.UUID) ([]Space, error)
	ListRoots(ctx context.Context, tenantID uuid.UUID) ([]Space, error)
	ListChildren(ctx context.Context, tenantID, parentID uuid.UUID) ([]Space, error)
	GetSubtree(ctx context.Context, tenantID uuid.UUID, rootPath string) ([]Space, error)
}

type pgRepository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new PostgreSQL-backed Repository.
func NewRepository(db *pgxpool.Pool) Repository {
	return &pgRepository{db: db}
}

func (r *pgRepository) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput, path string) (*Space, error) {
	const q = `
		INSERT INTO spaces (tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, space_type, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE(NULLIF($10, ''), 'public'), COALESCE(NULLIF($11, ''), 'workstream'), 'on_track')
		RETURNING id, tenant_id, parent_space_id, name, COALESCE(description, ''), slug, COALESCE(icon, ''), COALESCE(color, ''), path, owner_id, visibility, space_type, COALESCE(wip_limits, '{}'), COALESCE(capacity_targets, '{}'), status, created_at, updated_at`

	row := r.db.QueryRow(ctx, q,
		tenantID,
		input.ParentSpaceID,
		input.Name,
		input.Description,
		input.Slug,
		input.Icon,
		input.Color,
		path,
		ownerID,
		input.Visibility,
		input.SpaceType,
	)

	return scanSpace(row)
}

func (r *pgRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Space, error) {
	const q = `
		SELECT id, tenant_id, parent_space_id, name, COALESCE(description, ''), slug, COALESCE(icon, ''), COALESCE(color, ''), path, owner_id, visibility, space_type, COALESCE(wip_limits, '{}'), COALESCE(capacity_targets, '{}'), status, created_at, updated_at
		FROM spaces
		WHERE id = $1 AND tenant_id = $2`

	row := r.db.QueryRow(ctx, q, id, tenantID)
	s, err := scanSpace(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("space", id.String())
		}
		return nil, err
	}
	return s, nil
}

func (r *pgRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Space, error) {
	const q = `
		UPDATE spaces SET
			name             = COALESCE($3, name),
			description      = COALESCE($4, description),
			icon             = COALESCE($5, icon),
			color            = COALESCE($6, color),
			visibility       = COALESCE($7, visibility),
			status           = COALESCE($8, status),
			space_type       = COALESCE($9, space_type),
			path             = COALESCE($10, path),
			wip_limits       = COALESCE($11, wip_limits),
			capacity_targets = COALESCE($12, capacity_targets),
			updated_at       = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, parent_space_id, name, COALESCE(description, ''), slug, COALESCE(icon, ''), COALESCE(color, ''), path, owner_id, visibility, space_type, COALESCE(wip_limits, '{}'), COALESCE(capacity_targets, '{}'), status, created_at, updated_at`

	row := r.db.QueryRow(ctx, q,
		id,
		tenantID,
		input.Name,
		input.Description,
		input.Icon,
		input.Color,
		input.Visibility,
		input.Status,
		input.SpaceType,
		input.Path,
		input.WipLimits,
		input.CapacityTargets,
	)

	s, err := scanSpace(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("space", id.String())
		}
		return nil, err
	}
	return s, nil
}

func (r *pgRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	const q = `DELETE FROM spaces WHERE id = $1 AND tenant_id = $2`

	result, err := r.db.Exec(ctx, q, id, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("space", id.String())
	}
	return nil
}

func (r *pgRepository) ListAll(ctx context.Context, tenantID uuid.UUID) ([]Space, error) {
	const q = `
		SELECT id, tenant_id, parent_space_id, name, COALESCE(description, ''), slug, COALESCE(icon, ''), COALESCE(color, ''), path, owner_id, visibility, space_type, COALESCE(wip_limits, '{}'), COALESCE(capacity_targets, '{}'), status, created_at, updated_at
		FROM spaces
		WHERE tenant_id = $1
		ORDER BY path`

	rows, err := r.db.Query(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	return scanSpaces(rows)
}

func (r *pgRepository) ListRoots(ctx context.Context, tenantID uuid.UUID) ([]Space, error) {
	const q = `
		SELECT id, tenant_id, parent_space_id, name, COALESCE(description, ''), slug, COALESCE(icon, ''), COALESCE(color, ''), path, owner_id, visibility, space_type, COALESCE(wip_limits, '{}'), COALESCE(capacity_targets, '{}'), status, created_at, updated_at
		FROM spaces
		WHERE tenant_id = $1 AND parent_space_id IS NULL
		ORDER BY name`

	rows, err := r.db.Query(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	return scanSpaces(rows)
}

func (r *pgRepository) ListChildren(ctx context.Context, tenantID, parentID uuid.UUID) ([]Space, error) {
	const q = `
		SELECT id, tenant_id, parent_space_id, name, COALESCE(description, ''), slug, COALESCE(icon, ''), COALESCE(color, ''), path, owner_id, visibility, space_type, COALESCE(wip_limits, '{}'), COALESCE(capacity_targets, '{}'), status, created_at, updated_at
		FROM spaces
		WHERE tenant_id = $1 AND parent_space_id = $2
		ORDER BY name`

	rows, err := r.db.Query(ctx, q, tenantID, parentID)
	if err != nil {
		return nil, err
	}
	return scanSpaces(rows)
}

func (r *pgRepository) GetSubtree(ctx context.Context, tenantID uuid.UUID, rootPath string) ([]Space, error) {
	const q = `
		SELECT id, tenant_id, parent_space_id, name, COALESCE(description, ''), slug, COALESCE(icon, ''), COALESCE(color, ''), path, owner_id, visibility, space_type, COALESCE(wip_limits, '{}'), COALESCE(capacity_targets, '{}'), status, created_at, updated_at
		FROM spaces
		WHERE tenant_id = $1 AND path LIKE $2
		ORDER BY path`

	rows, err := r.db.Query(ctx, q, tenantID, rootPath+"%")
	if err != nil {
		return nil, err
	}
	return scanSpaces(rows)
}

// scanSpace scans a single space row.
func scanSpace(row pgx.Row) (*Space, error) {
	var s Space
	err := row.Scan(
		&s.ID,
		&s.TenantID,
		&s.ParentSpaceID,
		&s.Name,
		&s.Description,
		&s.Slug,
		&s.Icon,
		&s.Color,
		&s.Path,
		&s.OwnerID,
		&s.Visibility,
		&s.SpaceType,
		&s.WipLimits,
		&s.CapacityTargets,
		&s.Status,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// scanSpaces scans multiple space rows.
func scanSpaces(rows pgx.Rows) ([]Space, error) {
	defer rows.Close()

	var spaces []Space
	for rows.Next() {
		var s Space
		if err := rows.Scan(
			&s.ID,
			&s.TenantID,
			&s.ParentSpaceID,
			&s.Name,
			&s.Description,
			&s.Slug,
			&s.Icon,
			&s.Color,
			&s.Path,
			&s.OwnerID,
			&s.Visibility,
			&s.SpaceType,
			&s.Status,
			&s.CreatedAt,
			&s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		spaces = append(spaces, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return spaces, nil
}
