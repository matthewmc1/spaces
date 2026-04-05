package realtime

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// EventType enumerates the kinds of real-time events we publish.
type EventType string

const (
	EventCardCreated  EventType = "card.created"
	EventCardUpdated  EventType = "card.updated"
	EventCardMoved    EventType = "card.moved"
	EventCardDeleted  EventType = "card.deleted"
	EventSpaceUpdated EventType = "space.updated"
	EventGoalCreated  EventType = "goal.created"
	EventGoalUpdated  EventType = "goal.updated"
	EventGoalDeleted  EventType = "goal.deleted"
)

// Event is the payload published to Redis and delivered to subscribers.
type Event struct {
	Type      EventType       `json:"type"`
	TenantID  uuid.UUID       `json:"tenant_id"`
	SpaceID   uuid.UUID       `json:"space_id"`
	ActorID   uuid.UUID       `json:"actor_id"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp time.Time       `json:"timestamp"`
}

// SpaceChannel returns the Redis pub/sub channel name for a given space.
// Channels are tenant-scoped to prevent cross-tenant leakage.
func SpaceChannel(tenantID, spaceID uuid.UUID) string {
	return "spaces:" + tenantID.String() + ":" + spaceID.String()
}
