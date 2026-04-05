package integrations

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// Repository defines the data access interface for integrations.
type Repository interface {
	// Integrations
	Create(ctx context.Context, tenantID, createdBy uuid.UUID, input CreateInput) (*Integration, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Integration, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Integration, error)
	Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Integration, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	GetByProvider(ctx context.Context, tenantID uuid.UUID, provider string) (*Integration, error)

	// Card links
	CreateCardLink(ctx context.Context, tenantID, cardID uuid.UUID, input CreateCardLinkInput) (*CardLink, error)
	DeleteCardLink(ctx context.Context, tenantID, linkID uuid.UUID) error
	ListByCard(ctx context.Context, tenantID, cardID uuid.UUID) ([]CardLink, error)
	UpdateCardLinkStatus(ctx context.Context, tenantID, linkID uuid.UUID, status string) error
}

type pgRepository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new PostgreSQL-backed Repository.
func NewRepository(db *pgxpool.Pool) Repository {
	return &pgRepository{db: db}
}

func (r *pgRepository) Create(ctx context.Context, tenantID, createdBy uuid.UUID, input CreateInput) (*Integration, error) {
	const q = `
		INSERT INTO integrations (tenant_id, space_id, created_by, provider, name, config)
		VALUES ($1, $2, $3, $4, $5, COALESCE($6, '{}'))
		RETURNING id, tenant_id, space_id, provider, name, config, status, created_by, created_at, updated_at`

	row := r.db.QueryRow(ctx, q,
		tenantID,
		input.SpaceID,
		createdBy,
		input.Provider,
		input.Name,
		input.Config,
	)

	return scanIntegration(row)
}

func (r *pgRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Integration, error) {
	const q = `
		SELECT id, tenant_id, space_id, provider, name, config, status, created_by, created_at, updated_at
		FROM integrations
		WHERE id = $1 AND tenant_id = $2`

	row := r.db.QueryRow(ctx, q, id, tenantID)
	i, err := scanIntegration(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("integration", id.String())
		}
		return nil, err
	}
	return i, nil
}

func (r *pgRepository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Integration, error) {
	const q = `
		SELECT id, tenant_id, space_id, provider, name, config, status, created_by, created_at, updated_at
		FROM integrations
		WHERE tenant_id = $1
		ORDER BY created_at ASC`

	rows, err := r.db.Query(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	return scanIntegrations(rows)
}

func (r *pgRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Integration, error) {
	const q = `
		UPDATE integrations SET
			name       = COALESCE($3, name),
			config     = COALESCE($4, config),
			status     = COALESCE($5, status),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, space_id, provider, name, config, status, created_by, created_at, updated_at`

	row := r.db.QueryRow(ctx, q,
		id,
		tenantID,
		input.Name,
		input.Config,
		input.Status,
	)

	i, err := scanIntegration(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("integration", id.String())
		}
		return nil, err
	}
	return i, nil
}

func (r *pgRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	const q = `DELETE FROM integrations WHERE id = $1 AND tenant_id = $2`

	result, err := r.db.Exec(ctx, q, id, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("integration", id.String())
	}
	return nil
}

// GetByProvider returns the first active integration for a tenant+provider.
// Used for webhook routing to find which tenant an incoming webhook belongs to.
func (r *pgRepository) GetByProvider(ctx context.Context, tenantID uuid.UUID, provider string) (*Integration, error) {
	const q = `
		SELECT id, tenant_id, space_id, provider, name, config, status, created_by, created_at, updated_at
		FROM integrations
		WHERE tenant_id = $1 AND provider = $2 AND status = 'active'
		ORDER BY created_at ASC
		LIMIT 1`

	row := r.db.QueryRow(ctx, q, tenantID, provider)
	i, err := scanIntegration(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("integration", provider)
		}
		return nil, err
	}
	return i, nil
}

func (r *pgRepository) CreateCardLink(ctx context.Context, tenantID, cardID uuid.UUID, input CreateCardLinkInput) (*CardLink, error) {
	const q = `
		INSERT INTO card_links (tenant_id, card_id, integration_id, external_type, external_id, external_url, title, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, card_id, integration_id, tenant_id, external_type, external_id, external_url, title, status, metadata, last_synced_at, created_at`

	row := r.db.QueryRow(ctx, q,
		tenantID,
		cardID,
		input.IntegrationID,
		input.ExternalType,
		input.ExternalID,
		input.ExternalURL,
		input.Title,
		input.Status,
	)

	return scanCardLink(row)
}

func (r *pgRepository) DeleteCardLink(ctx context.Context, tenantID, linkID uuid.UUID) error {
	const q = `DELETE FROM card_links WHERE id = $1 AND tenant_id = $2`

	result, err := r.db.Exec(ctx, q, linkID, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("card_link", linkID.String())
	}
	return nil
}

func (r *pgRepository) ListByCard(ctx context.Context, tenantID, cardID uuid.UUID) ([]CardLink, error) {
	const q = `
		SELECT id, card_id, integration_id, tenant_id, external_type, external_id, external_url, title, status, metadata, last_synced_at, created_at
		FROM card_links
		WHERE tenant_id = $1 AND card_id = $2
		ORDER BY created_at ASC`

	rows, err := r.db.Query(ctx, q, tenantID, cardID)
	if err != nil {
		return nil, err
	}
	return scanCardLinks(rows)
}

func (r *pgRepository) UpdateCardLinkStatus(ctx context.Context, tenantID, linkID uuid.UUID, status string) error {
	const q = `UPDATE card_links SET status = $3 WHERE id = $1 AND tenant_id = $2`

	result, err := r.db.Exec(ctx, q, linkID, tenantID, status)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("card_link", linkID.String())
	}
	return nil
}

// scanIntegration scans a single integration row.
func scanIntegration(row pgx.Row) (*Integration, error) {
	var i Integration
	err := row.Scan(
		&i.ID,
		&i.TenantID,
		&i.SpaceID,
		&i.Provider,
		&i.Name,
		&i.Config,
		&i.Status,
		&i.CreatedBy,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &i, nil
}

// scanIntegrations scans multiple integration rows.
func scanIntegrations(rows pgx.Rows) ([]Integration, error) {
	defer rows.Close()

	var integrations []Integration
	for rows.Next() {
		var i Integration
		if err := rows.Scan(
			&i.ID,
			&i.TenantID,
			&i.SpaceID,
			&i.Provider,
			&i.Name,
			&i.Config,
			&i.Status,
			&i.CreatedBy,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		integrations = append(integrations, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return integrations, nil
}

// scanCardLink scans a single card_link row.
func scanCardLink(row pgx.Row) (*CardLink, error) {
	var l CardLink
	err := row.Scan(
		&l.ID,
		&l.CardID,
		&l.IntegrationID,
		&l.TenantID,
		&l.ExternalType,
		&l.ExternalID,
		&l.ExternalURL,
		&l.Title,
		&l.Status,
		&l.Metadata,
		&l.LastSyncedAt,
		&l.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

// scanCardLinks scans multiple card_link rows.
func scanCardLinks(rows pgx.Rows) ([]CardLink, error) {
	defer rows.Close()

	var links []CardLink
	for rows.Next() {
		var l CardLink
		if err := rows.Scan(
			&l.ID,
			&l.CardID,
			&l.IntegrationID,
			&l.TenantID,
			&l.ExternalType,
			&l.ExternalID,
			&l.ExternalURL,
			&l.Title,
			&l.Status,
			&l.Metadata,
			&l.LastSyncedAt,
			&l.CreatedAt,
		); err != nil {
			return nil, err
		}
		links = append(links, l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return links, nil
}
