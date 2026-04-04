package settings

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository defines the data access interface for user settings.
type Repository interface {
	GetOrCreate(ctx context.Context, tenantID, userID uuid.UUID) (*UserSettings, error)
	Update(ctx context.Context, tenantID, userID uuid.UUID, input UpdateInput) (*UserSettings, error)
}

type pgRepository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new PostgreSQL-backed Repository.
func NewRepository(db *pgxpool.Pool) Repository {
	return &pgRepository{db: db}
}

func (r *pgRepository) GetOrCreate(ctx context.Context, tenantID, userID uuid.UUID) (*UserSettings, error) {
	const insert = `
		INSERT INTO user_settings (user_id, tenant_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id) DO NOTHING`

	_, err := r.db.Exec(ctx, insert, userID, tenantID)
	if err != nil {
		return nil, err
	}

	const sel = `
		SELECT id, user_id, tenant_id, theme, default_space_id,
		       notification_prefs, board_prefs, timezone, created_at, updated_at
		FROM user_settings
		WHERE user_id = $1 AND tenant_id = $2`

	row := r.db.QueryRow(ctx, sel, userID, tenantID)
	return scanSettings(row)
}

func (r *pgRepository) Update(ctx context.Context, tenantID, userID uuid.UUID, input UpdateInput) (*UserSettings, error) {
	const q = `
		UPDATE user_settings SET
			theme            = COALESCE($3, theme),
			default_space_id = COALESCE($4, default_space_id),
			notification_prefs = COALESCE($5, notification_prefs),
			board_prefs      = COALESCE($6, board_prefs),
			timezone         = COALESCE($7, timezone),
			updated_at       = NOW()
		WHERE user_id = $1 AND tenant_id = $2
		RETURNING id, user_id, tenant_id, theme, default_space_id,
		          notification_prefs, board_prefs, timezone, created_at, updated_at`

	row := r.db.QueryRow(ctx, q,
		userID,
		tenantID,
		input.Theme,
		input.DefaultSpaceID,
		input.NotificationPrefs,
		input.BoardPrefs,
		input.Timezone,
	)

	return scanSettings(row)
}

func scanSettings(row pgx.Row) (*UserSettings, error) {
	var s UserSettings
	err := row.Scan(
		&s.ID,
		&s.UserID,
		&s.TenantID,
		&s.Theme,
		&s.DefaultSpaceID,
		&s.NotificationPrefs,
		&s.BoardPrefs,
		&s.Timezone,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}
