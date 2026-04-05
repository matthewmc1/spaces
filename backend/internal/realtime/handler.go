package realtime

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
)

type Handler struct {
	hub      *Hub
	verifier auth.TokenVerifier
	upgrader websocket.Upgrader
}

func NewHandler(hub *Hub, verifier auth.TokenVerifier, allowedOrigin string) *Handler {
	return &Handler{
		hub:      hub,
		verifier: verifier,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				return origin == "" || origin == allowedOrigin
			},
		},
	}
}

// HandleWS handles GET /ws?space=<uuid>&token=<token>
// Query params are used because browsers can't send custom headers during
// WebSocket handshake. The token is verified before upgrading the connection.
func (h *Handler) HandleWS(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		respond.Error(w, errors.Unauthorized("missing token"))
		return
	}
	claims, err := h.verifier.Verify(r.Context(), token)
	if err != nil {
		respond.Error(w, errors.Unauthorized("invalid token"))
		return
	}

	spaceStr := r.URL.Query().Get("space")
	spaceID, err := uuid.Parse(spaceStr)
	if err != nil {
		respond.Error(w, errors.Validation("invalid space id"))
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		// Upgrade already wrote an error response
		return
	}

	client := &Client{
		conn:     conn,
		tenantID: claims.TenantID,
		spaceID:  spaceID,
		userID:   claims.UserID,
		send:     make(chan []byte, 64),
	}

	ctx, cancel := context.WithCancel(context.Background())
	h.hub.Register(ctx, client)

	go writePump(client, cancel)
	go readPump(client, h.hub, cancel)
}

// writePump forwards messages from the send channel to the WebSocket.
// Also sends periodic pings to keep the connection alive.
func writePump(client *Client, cancel context.CancelFunc) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		client.conn.Close()
		cancel()
	}()

	for {
		select {
		case msg, ok := <-client.send:
			if !ok {
				client.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := client.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump reads from the WebSocket to detect disconnection.
// We don't process inbound messages (this is a one-way broadcast channel).
func readPump(client *Client, hub *Hub, cancel context.CancelFunc) {
	defer func() {
		hub.Unregister(client)
		client.conn.Close()
		cancel()
	}()

	client.conn.SetReadLimit(512)
	client.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.conn.SetPongHandler(func(string) error {
		client.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		if _, _, err := client.conn.ReadMessage(); err != nil {
			return
		}
	}
}
