package cards

import "net/http"

// RegisterRoutes registers all card routes on the given mux, wrapped with auth and tenant middleware.
func RegisterRoutes(mux *http.ServeMux, h *Handler, authMiddleware, tenantMiddleware func(http.Handler) http.Handler) {
	wrap := func(handler http.HandlerFunc) http.Handler {
		return authMiddleware(tenantMiddleware(handler))
	}
	mux.Handle("GET /spaces/{id}/cards", wrap(h.HandleListCards))
	mux.Handle("POST /spaces/{id}/cards", wrap(h.HandleCreateCard))
	mux.Handle("PUT /cards/{id}", wrap(h.HandleUpdateCard))
	mux.Handle("PATCH /cards/{id}/move", wrap(h.HandleMoveCard))
	mux.Handle("DELETE /cards/{id}", wrap(h.HandleDeleteCard))
}
