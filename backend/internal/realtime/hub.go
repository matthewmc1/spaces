package realtime

import (
	"context"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Client is a single WebSocket connection bound to a space.
type Client struct {
	conn     *websocket.Conn
	tenantID uuid.UUID
	spaceID  uuid.UUID
	userID   uuid.UUID
	send     chan []byte
}

// Hub tracks active clients and forwards Redis events to them.
type Hub struct {
	bus     *Bus
	clients map[*Client]struct{}
	mu      sync.RWMutex
}

// NewHub creates a new Hub.
func NewHub(bus *Bus) *Hub {
	return &Hub{
		bus:     bus,
		clients: make(map[*Client]struct{}),
	}
}

// Register adds a client and starts its Redis subscription goroutine.
// The subscription runs until the client disconnects or the context is canceled.
func (h *Hub) Register(ctx context.Context, client *Client) {
	h.mu.Lock()
	h.clients[client] = struct{}{}
	h.mu.Unlock()

	go h.pump(ctx, client)
}

// Unregister removes a client and closes its send channel.
func (h *Hub) Unregister(client *Client) {
	h.mu.Lock()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.send)
	}
	h.mu.Unlock()
}

// pump subscribes the client to its space channel and forwards messages.
func (h *Hub) pump(ctx context.Context, client *Client) {
	sub := h.bus.Subscribe(ctx, client.tenantID, client.spaceID)
	defer sub.Close()

	ch := sub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			select {
			case client.send <- []byte(msg.Payload):
			default:
				// Client send buffer full — drop the message rather than block.
				slog.Warn("dropping realtime message: client send buffer full",
					"tenant_id", client.tenantID, "space_id", client.spaceID)
			}
		}
	}
}
