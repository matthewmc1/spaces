package rbac

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// Repository defines the data access interface for role assignments.
type Repository interface {
	Assign(ctx context.Context, tenantID, userID uuid.UUID, spaceID *uuid.UUID, role string) (*RoleAssignment, error)
	Revoke(ctx context.Context, tenantID, id uuid.UUID) error
	GetRole(ctx context.Context, tenantID, userID uuid.UUID, spaceID *uuid.UUID) (string, error)
	ListBySpace(ctx context.Context, tenantID uuid.UUID, spaceID *uuid.UUID) ([]RoleAssignment, error)
}

type pgRepository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new PostgreSQL-backed Repository.
func NewRepository(db *pgxpool.Pool) Repository {
	return &pgRepository{db: db}
}

func (r *pgRepository) Assign(ctx context.Context, tenantID, userID uuid.UUID, spaceID *uuid.UUID, role string) (*RoleAssignment, error) {
	const q = `
		INSERT INTO role_assignments (tenant_id, user_id, space_id, role)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (tenant_id, user_id, space_id) DO UPDATE SET role = EXCLUDED.role
		RETURNING id, tenant_id, user_id, space_id, role, created_at`

	row := r.db.QueryRow(ctx, q, tenantID, userID, spaceID, role)
	return scanRoleAssignment(row)
}

func (r *pgRepository) Revoke(ctx context.Context, tenantID, id uuid.UUID) error {
	const q = `DELETE FROM role_assignments WHERE id = $1 AND tenant_id = $2`

	result, err := r.db.Exec(ctx, q, id, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("role_assignment", id.String())
	}
	return nil
}

func (r *pgRepository) GetRole(ctx context.Context, tenantID, userID uuid.UUID, spaceID *uuid.UUID) (string, error) {
	// Try space-level role first.
	if spaceID != nil {
		const q = `
			SELECT role FROM role_assignments
			WHERE tenant_id = $1 AND user_id = $2 AND space_id = $3`

		var role string
		err := r.db.QueryRow(ctx, q, tenantID, userID, spaceID).Scan(&role)
		if err == nil {
			return role, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return "", err
		}
	}

	// Try tenant-level role (space_id IS NULL).
	{
		const q = `
			SELECT role FROM role_assignments
			WHERE tenant_id = $1 AND user_id = $2 AND space_id IS NULL`

		var role string
		err := r.db.QueryRow(ctx, q, tenantID, userID).Scan(&role)
		if err == nil {
			return role, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return "", err
		}
	}

	// Fall back to users.role.
	{
		const q = `SELECT role FROM users WHERE id = $1 AND tenant_id = $2`

		var role string
		err := r.db.QueryRow(ctx, q, userID, tenantID).Scan(&role)
		if err == nil {
			return role, nil
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return "", domainerrors.NotFound("user", userID.String())
		}
		return "", err
	}
}

func (r *pgRepository) ListBySpace(ctx context.Context, tenantID uuid.UUID, spaceID *uuid.UUID) ([]RoleAssignment, error) {
	const q = `
		SELECT id, tenant_id, user_id, space_id, role, created_at
		FROM role_assignments
		WHERE tenant_id = $1 AND space_id = $2`

	rows, err := r.db.Query(ctx, q, tenantID, spaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []RoleAssignment
	for rows.Next() {
		var ra RoleAssignment
		if err := rows.Scan(&ra.ID, &ra.TenantID, &ra.UserID, &ra.SpaceID, &ra.Role, &ra.CreatedAt); err != nil {
			return nil, err
		}
		assignments = append(assignments, ra)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return assignments, nil
}

// scanRoleAssignment scans a single role assignment row.
func scanRoleAssignment(row pgx.Row) (*RoleAssignment, error) {
	var ra RoleAssignment
	err := row.Scan(&ra.ID, &ra.TenantID, &ra.UserID, &ra.SpaceID, &ra.Role, &ra.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &ra, nil
}
