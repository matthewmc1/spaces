package spaces

import "net/http"

// RegisterRoutes registers all space-related routes on the given mux.
func RegisterRoutes(mux *http.ServeMux, h *Handler, authMiddleware, tenantMiddleware func(http.Handler) http.Handler) {
	wrap := func(handler http.HandlerFunc) http.Handler {
		return authMiddleware(tenantMiddleware(handler))
	}
	mux.Handle("GET /spaces", wrap(h.HandleListSpaces))
	mux.Handle("GET /spaces/{id}", wrap(h.HandleGetSpace))
	mux.Handle("GET /spaces/{id}/tree", wrap(h.HandleGetTree))
	mux.Handle("POST /spaces", wrap(h.HandleCreateSpace))
	mux.Handle("PUT /spaces/{id}", wrap(h.HandleUpdateSpace))
	mux.Handle("DELETE /spaces/{id}", wrap(h.HandleDeleteSpace))
}
