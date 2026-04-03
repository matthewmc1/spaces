package spaces

import "net/http"

// RegisterRoutes registers all space-related routes on the given mux.
func RegisterRoutes(mux *http.ServeMux, h *Handler, authMW, tenantMW func(http.Handler) http.Handler, requireMember, requireAdmin func(http.Handler) http.Handler) {
	read := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}
	write := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(requireMember(fn)))
	}
	admin := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(requireAdmin(fn)))
	}

	mux.Handle("GET /spaces", read(h.HandleListSpaces))
	mux.Handle("GET /spaces/{id}", read(h.HandleGetSpace))
	mux.Handle("GET /spaces/{id}/tree", read(h.HandleGetTree))
	mux.Handle("POST /spaces", write(h.HandleCreateSpace))
	mux.Handle("PUT /spaces/{id}", write(h.HandleUpdateSpace))
	mux.Handle("DELETE /spaces/{id}", admin(h.HandleDeleteSpace))
}
