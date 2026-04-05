package activity

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Activity represents an audit log entry.
type Activity struct {
	ID         uuid.UUID       `json:"id"`
	TenantID   uuid.UUID       `json:"tenant_id"`
	EntityType string          `json:"entity_type"`
	EntityID   uuid.UUID       `json:"entity_id"`
	ActorID    uuid.UUID       `json:"actor_id"`
	Action     string          `json:"action"`
	Changes    json.RawMessage `json:"changes"`
	CreatedAt  time.Time       `json:"created_at"`
}
