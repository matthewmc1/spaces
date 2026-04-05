package programmes

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type Repository interface {
	Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput) (*Programme, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Programme, error)
	Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Programme, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Programme, error)

	LinkSpace(ctx context.Context, tenantID, programmeID, spaceID uuid.UUID, role string) (*ProgrammeSpace, error)
	UnlinkSpace(ctx context.Context, tenantID, programmeID, spaceID uuid.UUID) error
	ListSpaces(ctx context.Context, tenantID, programmeID uuid.UUID) ([]ProgrammeSpace, error)
	ListByTenantSpace(ctx context.Context, tenantID, spaceID uuid.UUID) ([]Programme, error)
}

type pgRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &pgRepository{db: db}
}

func (r *pgRepository) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput) (*Programme, error) {
	const q = `
		INSERT INTO programmes (tenant_id, name, description, owner_id, start_date, target_date)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, tenant_id, name, COALESCE(description, ''), status, owner_id, start_date, target_date, created_at, updated_at`

	row := r.db.QueryRow(ctx, q, tenantID, input.Name, input.Description, ownerID, input.StartDate, input.TargetDate)
	return scanProgramme(row)
}

func (r *pgRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Programme, error) {
	const q = `
		SELECT id, tenant_id, name, COALESCE(description, ''), status, owner_id, start_date, target_date, created_at, updated_at
		FROM programmes WHERE id = $1 AND tenant_id = $2`
	row := r.db.QueryRow(ctx, q, id, tenantID)
	p, err := scanProgramme(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("programme", id.String())
		}
		return nil, err
	}
	return p, nil
}

func (r *pgRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Programme, error) {
	const q = `
		UPDATE programmes SET
			name        = COALESCE($3, name),
			description = COALESCE($4, description),
			status      = COALESCE($5, status),
			start_date  = COALESCE($6, start_date),
			target_date = COALESCE($7, target_date),
			updated_at  = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, name, COALESCE(description, ''), status, owner_id, start_date, target_date, created_at, updated_at`

	row := r.db.QueryRow(ctx, q, id, tenantID, input.Name, input.Description, input.Status, input.StartDate, input.TargetDate)
	p, err := scanProgramme(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("programme", id.String())
		}
		return nil, err
	}
	return p, nil
}

func (r *pgRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	const q = `DELETE FROM programmes WHERE id = $1 AND tenant_id = $2`
	result, err := r.db.Exec(ctx, q, id, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("programme", id.String())
	}
	return nil
}

func (r *pgRepository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Programme, error) {
	const q = `
		SELECT id, tenant_id, name, COALESCE(description, ''), status, owner_id, start_date, target_date, created_at, updated_at
		FROM programmes WHERE tenant_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var programmes []Programme
	for rows.Next() {
		p, err := scanProgrammeFromRows(rows)
		if err != nil {
			return nil, err
		}
		programmes = append(programmes, *p)
	}
	return programmes, rows.Err()
}

func (r *pgRepository) LinkSpace(ctx context.Context, tenantID, programmeID, spaceID uuid.UUID, role string) (*ProgrammeSpace, error) {
	const q = `
		INSERT INTO programme_spaces (programme_id, space_id, tenant_id, role)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (programme_id, space_id) DO UPDATE SET role = EXCLUDED.role
		RETURNING programme_id, space_id, tenant_id, role, created_at`
	var ps ProgrammeSpace
	err := r.db.QueryRow(ctx, q, programmeID, spaceID, tenantID, role).Scan(
		&ps.ProgrammeID, &ps.SpaceID, &ps.TenantID, &ps.Role, &ps.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &ps, nil
}

func (r *pgRepository) UnlinkSpace(ctx context.Context, tenantID, programmeID, spaceID uuid.UUID) error {
	const q = `DELETE FROM programme_spaces WHERE tenant_id = $1 AND programme_id = $2 AND space_id = $3`
	result, err := r.db.Exec(ctx, q, tenantID, programmeID, spaceID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("programme_space", spaceID.String())
	}
	return nil
}

func (r *pgRepository) ListSpaces(ctx context.Context, tenantID, programmeID uuid.UUID) ([]ProgrammeSpace, error) {
	const q = `
		SELECT programme_id, space_id, tenant_id, role, created_at
		FROM programme_spaces WHERE tenant_id = $1 AND programme_id = $2`
	rows, err := r.db.Query(ctx, q, tenantID, programmeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var links []ProgrammeSpace
	for rows.Next() {
		var ps ProgrammeSpace
		if err := rows.Scan(&ps.ProgrammeID, &ps.SpaceID, &ps.TenantID, &ps.Role, &ps.CreatedAt); err != nil {
			return nil, err
		}
		links = append(links, ps)
	}
	return links, rows.Err()
}

func (r *pgRepository) ListByTenantSpace(ctx context.Context, tenantID, spaceID uuid.UUID) ([]Programme, error) {
	const q = `
		SELECT DISTINCT p.id, p.tenant_id, p.name, COALESCE(p.description, ''), p.status, p.owner_id, p.start_date, p.target_date, p.created_at, p.updated_at
		FROM programmes p
		JOIN programme_spaces ps ON ps.programme_id = p.id
		WHERE p.tenant_id = $1 AND ps.space_id = $2
		ORDER BY p.created_at DESC`
	rows, err := r.db.Query(ctx, q, tenantID, spaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var programmes []Programme
	for rows.Next() {
		p, err := scanProgrammeFromRows(rows)
		if err != nil {
			return nil, err
		}
		programmes = append(programmes, *p)
	}
	return programmes, rows.Err()
}

func scanProgramme(row pgx.Row) (*Programme, error) {
	var p Programme
	err := row.Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.Status, &p.OwnerID, &p.StartDate, &p.TargetDate, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func scanProgrammeFromRows(rows pgx.Rows) (*Programme, error) {
	var p Programme
	err := rows.Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.Status, &p.OwnerID, &p.StartDate, &p.TargetDate, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}
