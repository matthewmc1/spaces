package cards

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
)

// Repository defines the data access interface for cards.
type Repository interface {
	Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Card, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Card, error)
	Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Card, error)
	Move(ctx context.Context, tenantID, id uuid.UUID, column Column, position float64) (*Card, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID, filters ListFilters, page pagination.Params) ([]Card, string, error)
}

type pgRepository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new PostgreSQL-backed Repository.
func NewRepository(db *pgxpool.Pool) Repository {
	return &pgRepository{db: db}
}

func (r *pgRepository) Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Card, error) {
	const q = `
		INSERT INTO cards (tenant_id, space_id, created_by, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels)
		VALUES ($1, $2, $3, $4, $5, $6,
			COALESCE($7, (SELECT COALESCE(MAX(position), 0) + 1000 FROM cards WHERE space_id = $2 AND column_name = 'inbox')),
			$8, $9, $10, $11, $12)
		RETURNING id, space_id, tenant_id, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels, created_by, created_at, updated_at, moved_at`

	labels := input.Labels
	if labels == nil {
		labels = []string{}
	}

	var priority *string
	if input.Priority != "" {
		priority = &input.Priority
	}

	row := r.db.QueryRow(ctx, q,
		tenantID,
		spaceID,
		createdBy,
		input.Title,
		input.Description,
		ColumnInbox,
		nil, // position: use default from subquery
		input.AssigneeID,
		priority,
		input.EffortEstimate,
		input.DueDate,
		labels,
	)

	return scanCard(row)
}

func (r *pgRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Card, error) {
	const q = `
		SELECT id, space_id, tenant_id, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels, created_by, created_at, updated_at, moved_at
		FROM cards
		WHERE id = $1 AND tenant_id = $2`

	row := r.db.QueryRow(ctx, q, id, tenantID)
	c, err := scanCard(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("card", id.String())
		}
		return nil, err
	}
	return c, nil
}

func (r *pgRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Card, error) {
	const q = `
		UPDATE cards SET
			title           = COALESCE($3, title),
			description     = COALESCE($4, description),
			priority        = COALESCE($5, priority),
			effort_estimate = COALESCE($6, effort_estimate),
			due_date        = COALESCE($7, due_date),
			labels          = COALESCE($8, labels),
			assignee_id     = COALESCE($9, assignee_id),
			updated_at      = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, space_id, tenant_id, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels, created_by, created_at, updated_at, moved_at`

	row := r.db.QueryRow(ctx, q,
		id,
		tenantID,
		input.Title,
		input.Description,
		input.Priority,
		input.EffortEstimate,
		input.DueDate,
		input.Labels,
		input.AssigneeID,
	)

	c, err := scanCard(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("card", id.String())
		}
		return nil, err
	}
	return c, nil
}

func (r *pgRepository) Move(ctx context.Context, tenantID, id uuid.UUID, column Column, position float64) (*Card, error) {
	const q = `
		UPDATE cards SET
			column_name = $3,
			position    = $4,
			moved_at    = NOW(),
			updated_at  = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, space_id, tenant_id, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels, created_by, created_at, updated_at, moved_at`

	row := r.db.QueryRow(ctx, q, id, tenantID, column, position)
	c, err := scanCard(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("card", id.String())
		}
		return nil, err
	}
	return c, nil
}

func (r *pgRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	const q = `DELETE FROM cards WHERE id = $1 AND tenant_id = $2`

	result, err := r.db.Exec(ctx, q, id, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("card", id.String())
	}
	return nil
}

func (r *pgRepository) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID, filters ListFilters, page pagination.Params) ([]Card, string, error) {
	args := []any{tenantID, spaceID}
	argIdx := 3

	where := "WHERE tenant_id = $1 AND space_id = $2"

	if filters.Column != "" {
		where += fmt.Sprintf(" AND column_name = $%d", argIdx)
		args = append(args, filters.Column)
		argIdx++
	}

	if filters.Assignee != nil {
		where += fmt.Sprintf(" AND assignee_id = $%d", argIdx)
		args = append(args, *filters.Assignee)
		argIdx++
	}

	if filters.Priority != "" {
		where += fmt.Sprintf(" AND priority = $%d", argIdx)
		args = append(args, filters.Priority)
		argIdx++
	}

	if page.Cursor != "" {
		decoded, err := pagination.DecodeCursor(page.Cursor)
		if err == nil {
			where += fmt.Sprintf(" AND position > $%d", argIdx)
			args = append(args, decoded)
			argIdx++
		}
	}

	_ = argIdx // suppress unused warning

	limit := page.Limit + 1

	q := fmt.Sprintf(`
		SELECT id, space_id, tenant_id, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels, created_by, created_at, updated_at, moved_at
		FROM cards
		%s
		ORDER BY position ASC
		LIMIT %s`, where, strconv.Itoa(limit))

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var cards []Card
	for rows.Next() {
		c, err := scanCardFromRows(rows)
		if err != nil {
			return nil, "", err
		}
		cards = append(cards, *c)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(cards) > page.Limit {
		cards = cards[:page.Limit]
		last := cards[len(cards)-1]
		nextCursor = pagination.EncodeCursor(strconv.FormatFloat(last.Position, 'f', -1, 64))
	}

	return cards, nextCursor, nil
}

func scanCard(row pgx.Row) (*Card, error) {
	var c Card
	err := row.Scan(
		&c.ID,
		&c.SpaceID,
		&c.TenantID,
		&c.Title,
		&c.Description,
		&c.ColumnName,
		&c.Position,
		&c.AssigneeID,
		&c.Priority,
		&c.EffortEstimate,
		&c.DueDate,
		&c.Labels,
		&c.CreatedBy,
		&c.CreatedAt,
		&c.UpdatedAt,
		&c.MovedAt,
	)
	if err != nil {
		return nil, err
	}
	if c.Labels == nil {
		c.Labels = []string{}
	}
	return &c, nil
}

func scanCardFromRows(rows pgx.Rows) (*Card, error) {
	var c Card
	err := rows.Scan(
		&c.ID,
		&c.SpaceID,
		&c.TenantID,
		&c.Title,
		&c.Description,
		&c.ColumnName,
		&c.Position,
		&c.AssigneeID,
		&c.Priority,
		&c.EffortEstimate,
		&c.DueDate,
		&c.Labels,
		&c.CreatedBy,
		&c.CreatedAt,
		&c.UpdatedAt,
		&c.MovedAt,
	)
	if err != nil {
		return nil, err
	}
	if c.Labels == nil {
		c.Labels = []string{}
	}
	return &c, nil
}
