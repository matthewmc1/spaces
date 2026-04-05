package auth

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// SignupInput holds the fields required to create a new org and owner user.
type SignupInput struct {
	OrgName  string `json:"org_name"`
	OrgSlug  string `json:"org_slug"`
	UserName string `json:"user_name"`
	Email    string `json:"email"`
}

// AuthService implements business logic for auth lifecycle operations.
type AuthService struct {
	db       *pgxpool.Pool
	userRepo *Repository
}

// NewAuthService creates a new AuthService.
func NewAuthService(db *pgxpool.Pool, userRepo *Repository) *AuthService {
	return &AuthService{db: db, userRepo: userRepo}
}

// GetCurrentUser retrieves the user identified by the provided claims.
func (s *AuthService) GetCurrentUser(ctx context.Context, claims *Claims) (*User, error) {
	return s.userRepo.GetByID(ctx, claims.TenantID, claims.UserID)
}

// Signup creates a new tenant and owner user within a transaction.
func (s *AuthService) Signup(ctx context.Context, input SignupInput) (*User, error) {
	if input.OrgName == "" {
		return nil, domainerrors.Validation("org_name is required")
	}
	if input.OrgSlug == "" {
		return nil, domainerrors.Validation("org_slug is required")
	}
	if input.UserName == "" {
		return nil, domainerrors.Validation("user_name is required")
	}
	if input.Email == "" {
		return nil, domainerrors.Validation("email is required")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var tenantID uuid.UUID
	err = tx.QueryRow(ctx,
		`INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
		input.OrgName, input.OrgSlug,
	).Scan(&tenantID)
	if err != nil {
		return nil, err
	}

	externalAuthID := "dev-" + input.Email

	var u User
	err = tx.QueryRow(ctx,
		`INSERT INTO users (tenant_id, external_auth_id, email, name, role)
		 VALUES ($1, $2, $3, $4, 'owner')
		 RETURNING id, tenant_id, external_auth_id, email, name, COALESCE(avatar_url, ''), role, created_at`,
		tenantID, externalAuthID, input.Email, input.UserName,
	).Scan(
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

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &u, nil
}

// InviteUser creates a new user within an existing tenant.
func (s *AuthService) InviteUser(ctx context.Context, tenantID uuid.UUID, name, email, role string) (*User, error) {
	if name == "" {
		return nil, domainerrors.Validation("name is required")
	}
	if email == "" {
		return nil, domainerrors.Validation("email is required")
	}

	externalAuthID := "dev-" + email

	const q = `
		INSERT INTO users (tenant_id, external_auth_id, email, name, role)
		VALUES ($1, $2, $3, $4, COALESCE(NULLIF($5, ''), 'member'))
		RETURNING id, tenant_id, external_auth_id, email, name, COALESCE(avatar_url, ''), role, created_at`

	row := s.db.QueryRow(ctx, q, tenantID, externalAuthID, email, name, role)
	return scanUser(row)
}

// ListUsers returns all users in the given tenant ordered by name.
func (s *AuthService) ListUsers(ctx context.Context, tenantID uuid.UUID) ([]User, error) {
	const q = `
		SELECT id, tenant_id, external_auth_id, email, name, COALESCE(avatar_url, ''), role, created_at
		FROM users
		WHERE tenant_id = $1
		ORDER BY name`

	rows, err := s.db.Query(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		u, err := scanUserFromRows(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, *u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

func scanUserFromRows(rows pgx.Rows) (*User, error) {
	var u User
	err := rows.Scan(
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

