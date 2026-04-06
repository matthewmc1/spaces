package goals

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// Repository defines the data access interface for goals.
type Repository interface {
	Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Goal, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Goal, error)
	Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Goal, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID) ([]Goal, error)

	CreateLink(ctx context.Context, tenantID, goalID uuid.UUID, input CreateLinkInput) (*GoalLink, error)
	DeleteLink(ctx context.Context, tenantID, linkID uuid.UUID) error
	ListLinksByGoal(ctx context.Context, tenantID, goalID uuid.UUID) ([]GoalLink, error)
	ListLinksBySource(ctx context.Context, tenantID uuid.UUID, sourceType string, sourceID uuid.UUID) ([]GoalLink, error)
	CountLinkedCards(ctx context.Context, tenantID, spaceID uuid.UUID) (linked int, total int, err error)

	GetGoalWithSpace(ctx context.Context, tenantID, goalID uuid.UUID) (*ChainNode, error)
	GetChainUp(ctx context.Context, tenantID, goalID uuid.UUID) ([]ChainNode, error)
	GetChainDown(ctx context.Context, tenantID, goalID uuid.UUID) ([]ChainNode, error)
}

type pgRepository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new PostgreSQL-backed Repository.
func NewRepository(db *pgxpool.Pool) Repository {
	return &pgRepository{db: db}
}

func (r *pgRepository) Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Goal, error) {
	const q = `
		INSERT INTO goals (tenant_id, space_id, created_by, title, description, status, target_date)
		VALUES ($1, $2, $3, $4, $5, 'on_track', $6)
		RETURNING id, tenant_id, space_id, title, description, status, target_date, created_by, created_at, updated_at`

	row := r.db.QueryRow(ctx, q,
		tenantID,
		spaceID,
		createdBy,
		input.Title,
		input.Description,
		input.TargetDate,
	)

	return scanGoal(row)
}

func (r *pgRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Goal, error) {
	const q = `
		SELECT id, tenant_id, space_id, title, description, status, target_date, created_by, created_at, updated_at
		FROM goals
		WHERE id = $1 AND tenant_id = $2`

	row := r.db.QueryRow(ctx, q, id, tenantID)
	g, err := scanGoal(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("goal", id.String())
		}
		return nil, err
	}
	return g, nil
}

func (r *pgRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Goal, error) {
	const q = `
		UPDATE goals SET
			title       = COALESCE($3, title),
			description = COALESCE($4, description),
			status      = COALESCE($5, status),
			target_date = COALESCE($6, target_date),
			updated_at  = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, space_id, title, description, status, target_date, created_by, created_at, updated_at`

	row := r.db.QueryRow(ctx, q,
		id,
		tenantID,
		input.Title,
		input.Description,
		input.Status,
		input.TargetDate,
	)

	g, err := scanGoal(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("goal", id.String())
		}
		return nil, err
	}
	return g, nil
}

func (r *pgRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	const q = `DELETE FROM goals WHERE id = $1 AND tenant_id = $2`

	result, err := r.db.Exec(ctx, q, id, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("goal", id.String())
	}
	return nil
}

func (r *pgRepository) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID) ([]Goal, error) {
	const q = `
		SELECT id, tenant_id, space_id, title, description, status, target_date, created_by, created_at, updated_at
		FROM goals
		WHERE tenant_id = $1 AND space_id = $2
		ORDER BY created_at ASC`

	rows, err := r.db.Query(ctx, q, tenantID, spaceID)
	if err != nil {
		return nil, err
	}
	return scanGoals(rows)
}

func (r *pgRepository) CreateLink(ctx context.Context, tenantID, goalID uuid.UUID, input CreateLinkInput) (*GoalLink, error) {
	const q = `
		INSERT INTO goal_links (tenant_id, source_type, source_id, target_goal_id, link_type)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, tenant_id, source_type, source_id, target_goal_id, link_type, created_at`

	row := r.db.QueryRow(ctx, q,
		tenantID,
		input.SourceType,
		input.SourceID,
		goalID,
		input.LinkType,
	)

	return scanGoalLink(row)
}

func (r *pgRepository) DeleteLink(ctx context.Context, tenantID, linkID uuid.UUID) error {
	const q = `DELETE FROM goal_links WHERE id = $1 AND tenant_id = $2`

	result, err := r.db.Exec(ctx, q, linkID, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("goal_link", linkID.String())
	}
	return nil
}

func (r *pgRepository) ListLinksByGoal(ctx context.Context, tenantID, goalID uuid.UUID) ([]GoalLink, error) {
	const q = `
		SELECT id, tenant_id, source_type, source_id, target_goal_id, link_type, created_at
		FROM goal_links
		WHERE tenant_id = $1 AND target_goal_id = $2
		ORDER BY created_at ASC`

	rows, err := r.db.Query(ctx, q, tenantID, goalID)
	if err != nil {
		return nil, err
	}
	return scanGoalLinks(rows)
}

func (r *pgRepository) ListLinksBySource(ctx context.Context, tenantID uuid.UUID, sourceType string, sourceID uuid.UUID) ([]GoalLink, error) {
	const q = `
		SELECT id, tenant_id, source_type, source_id, target_goal_id, link_type, created_at
		FROM goal_links
		WHERE tenant_id = $1 AND source_type = $2 AND source_id = $3
		ORDER BY created_at ASC`

	rows, err := r.db.Query(ctx, q, tenantID, sourceType, sourceID)
	if err != nil {
		return nil, err
	}
	return scanGoalLinks(rows)
}

// CountLinkedCards returns the count of in-flight cards linked to at least one goal (linked)
// and the total count of in-flight cards (total) within the given space.
// In-flight columns: planned, in_progress, review.
func (r *pgRepository) CountLinkedCards(ctx context.Context, tenantID, spaceID uuid.UUID) (linked int, total int, err error) {
	const q = `
		SELECT
			COUNT(DISTINCT c.id) FILTER (WHERE gl.id IS NOT NULL) AS linked,
			COUNT(DISTINCT c.id) AS total
		FROM cards c
		LEFT JOIN goal_links gl
			ON gl.source_type = 'card'
			AND gl.source_id = c.id
			AND gl.tenant_id = c.tenant_id
		WHERE c.tenant_id = $1
			AND c.space_id = $2
			AND c.column_name IN ('planned', 'in_progress', 'review')`

	row := r.db.QueryRow(ctx, q, tenantID, spaceID)
	if err = row.Scan(&linked, &total); err != nil {
		return 0, 0, err
	}
	return linked, total, nil
}

// GetGoalWithSpace returns a ChainNode for a single goal joined with its space.
func (r *pgRepository) GetGoalWithSpace(ctx context.Context, tenantID, goalID uuid.UUID) (*ChainNode, error) {
	const q = `
		SELECT g.id, g.title, g.status, g.space_id, COALESCE(s.name, ''), COALESCE(s.space_type, '')
		FROM goals g
		JOIN spaces s ON s.id = g.space_id
		WHERE g.id = $1 AND g.tenant_id = $2`

	var n ChainNode
	err := r.db.QueryRow(ctx, q, goalID, tenantID).Scan(
		&n.ID, &n.Title, &n.Status, &n.SpaceID, &n.SpaceName, &n.SpaceType,
	)
	if err != nil {
		return nil, err
	}
	n.Type = "goal"
	return &n, nil
}

// GetChainUp walks goal_links upward from goalID, returning the ancestor chain.
func (r *pgRepository) GetChainUp(ctx context.Context, tenantID, goalID uuid.UUID) ([]ChainNode, error) {
	var ancestors []ChainNode
	currentID := goalID
	visited := make(map[uuid.UUID]bool)

	for {
		if visited[currentID] {
			break // prevent cycles
		}
		visited[currentID] = true

		const q = `
			SELECT g.id, g.title, g.status, g.space_id, COALESCE(s.name, ''), COALESCE(s.space_type, ''), gl.link_type
			FROM goal_links gl
			JOIN goals g ON g.id = gl.target_goal_id
			JOIN spaces s ON s.id = g.space_id
			WHERE gl.source_type = 'goal' AND gl.source_id = $1 AND gl.tenant_id = $2`

		var node ChainNode
		err := r.db.QueryRow(ctx, q, currentID, tenantID).Scan(
			&node.ID, &node.Title, &node.Status, &node.SpaceID, &node.SpaceName, &node.SpaceType, &node.LinkType,
		)
		if err != nil {
			break // no more parents
		}
		node.Type = "goal"
		ancestors = append(ancestors, node)
		currentID = node.ID
	}

	return ancestors, nil
}

// GetChainDown returns all supporters of goalID — sub-goals and cards linked to it.
func (r *pgRepository) GetChainDown(ctx context.Context, tenantID, goalID uuid.UUID) ([]ChainNode, error) {
	// Sub-goals
	const goalQ = `
		SELECT g.id, g.title, g.status, g.space_id, COALESCE(s.name, ''), COALESCE(s.space_type, ''), gl.link_type
		FROM goal_links gl
		JOIN goals g ON g.id = gl.source_id
		JOIN spaces s ON s.id = g.space_id
		WHERE gl.target_goal_id = $1 AND gl.source_type = 'goal' AND gl.tenant_id = $2`

	// Cards
	const cardQ = `
		SELECT c.id, c.title, c.column_name, c.space_id, COALESCE(s.name, ''), COALESCE(s.space_type, ''), gl.link_type, COALESCE(c.priority, ''), COALESCE(c.work_type, 'feature')
		FROM goal_links gl
		JOIN cards c ON c.id = gl.source_id
		JOIN spaces s ON s.id = c.space_id
		WHERE gl.target_goal_id = $1 AND gl.source_type = 'card' AND gl.tenant_id = $2`

	var supporters []ChainNode

	rows, err := r.db.Query(ctx, goalQ, goalID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var n ChainNode
		if err := rows.Scan(&n.ID, &n.Title, &n.Status, &n.SpaceID, &n.SpaceName, &n.SpaceType, &n.LinkType); err != nil {
			return nil, err
		}
		n.Type = "goal"
		supporters = append(supporters, n)
	}

	rows2, err := r.db.Query(ctx, cardQ, goalID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows2.Close()
	for rows2.Next() {
		var n ChainNode
		if err := rows2.Scan(&n.ID, &n.Title, &n.ColumnName, &n.SpaceID, &n.SpaceName, &n.SpaceType, &n.LinkType, &n.Priority, &n.WorkType); err != nil {
			return nil, err
		}
		n.Type = "card"
		supporters = append(supporters, n)
	}

	return supporters, nil
}

// scanGoal scans a single goal row.
func scanGoal(row pgx.Row) (*Goal, error) {
	var g Goal
	err := row.Scan(
		&g.ID,
		&g.TenantID,
		&g.SpaceID,
		&g.Title,
		&g.Description,
		&g.Status,
		&g.TargetDate,
		&g.CreatedBy,
		&g.CreatedAt,
		&g.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

// scanGoals scans multiple goal rows.
func scanGoals(rows pgx.Rows) ([]Goal, error) {
	defer rows.Close()

	var goals []Goal
	for rows.Next() {
		var g Goal
		if err := rows.Scan(
			&g.ID,
			&g.TenantID,
			&g.SpaceID,
			&g.Title,
			&g.Description,
			&g.Status,
			&g.TargetDate,
			&g.CreatedBy,
			&g.CreatedAt,
			&g.UpdatedAt,
		); err != nil {
			return nil, err
		}
		goals = append(goals, g)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return goals, nil
}

// scanGoalLink scans a single goal_link row.
func scanGoalLink(row pgx.Row) (*GoalLink, error) {
	var l GoalLink
	err := row.Scan(
		&l.ID,
		&l.TenantID,
		&l.SourceType,
		&l.SourceID,
		&l.TargetGoalID,
		&l.LinkType,
		&l.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

// scanGoalLinks scans multiple goal_link rows.
func scanGoalLinks(rows pgx.Rows) ([]GoalLink, error) {
	defer rows.Close()

	var links []GoalLink
	for rows.Next() {
		var l GoalLink
		if err := rows.Scan(
			&l.ID,
			&l.TenantID,
			&l.SourceType,
			&l.SourceID,
			&l.TargetGoalID,
			&l.LinkType,
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
