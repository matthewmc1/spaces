package realtime

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// Bus publishes events to and subscribes from Redis pub/sub.
type Bus struct {
	client *redis.Client
}

// NewBus creates a new Bus backed by the given Redis client.
func NewBus(client *redis.Client) *Bus {
	return &Bus{client: client}
}

// Publish encodes and publishes an event to the appropriate space channel.
// Pub/sub is best-effort — callers should log errors and continue.
func (b *Bus) Publish(ctx context.Context, tenantID, spaceID, actorID uuid.UUID, eventType EventType, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	ev := Event{
		Type:      eventType,
		TenantID:  tenantID,
		SpaceID:   spaceID,
		ActorID:   actorID,
		Payload:   raw,
		Timestamp: time.Now().UTC(),
	}
	data, err := json.Marshal(ev)
	if err != nil {
		return err
	}
	return b.client.Publish(ctx, SpaceChannel(tenantID, spaceID), data).Err()
}

// Subscribe returns a pub/sub subscription for the given space channel.
// The caller is responsible for closing the returned PubSub.
func (b *Bus) Subscribe(ctx context.Context, tenantID, spaceID uuid.UUID) *redis.PubSub {
	return b.client.Subscribe(ctx, SpaceChannel(tenantID, spaceID))
}
