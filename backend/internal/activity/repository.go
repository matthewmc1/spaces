package activity

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository writes and reads activity log entries.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new Repository.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Log writes an activity entry. Errors are returned but callers should log
// and continue — activity logging is best-effort and must not fail requests.
func (r *Repository) Log(ctx context.Context, tenantID, entityID, actorID uuid.UUID, entityType, action string, changes any) error {
	raw, err := json.Marshal(changes)
	if err != nil {
		return err
	}
	const q = `
		INSERT INTO activities (tenant_id, entity_type, entity_id, actor_id, action, changes)
		VALUES ($1, $2, $3, $4, $5, $6)`
	_, err = r.db.Exec(ctx, q, tenantID, entityType, entityID, actorID, action, raw)
	return err
}

// ListByTenant returns recent activities for a tenant, newest first.
func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit int) ([]Activity, error) {
	if limit <= 0 {
		limit = 50
	}
	const q = `
		SELECT id, tenant_id, entity_type, entity_id, actor_id, action, changes, created_at
		FROM activities WHERE tenant_id = $1
		ORDER BY created_at DESC LIMIT $2`
	rows, err := r.db.Query(ctx, q, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var activities []Activity
	for rows.Next() {
		var a Activity
		if err := rows.Scan(&a.ID, &a.TenantID, &a.EntityType, &a.EntityID, &a.ActorID, &a.Action, &a.Changes, &a.CreatedAt); err != nil {
			return nil, err
		}
		activities = append(activities, a)
	}
	return activities, rows.Err()
}
