package realtime

import "net/http"

// RegisterRoutes registers the WebSocket endpoint. No middleware is applied
// because auth happens inside HandleWS via the token query param.
func RegisterRoutes(mux *http.ServeMux, h *Handler) {
	mux.HandleFunc("GET /ws", h.HandleWS)
}
