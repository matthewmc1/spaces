package cards

import "net/http"

// RegisterRoutes registers all card routes on the given mux, wrapped with auth and tenant middleware.
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

	mux.Handle("GET /spaces/{id}/cards", read(h.HandleListCards))
	mux.Handle("POST /spaces/{id}/cards", write(h.HandleCreateCard))
	mux.Handle("PUT /cards/{id}", write(h.HandleUpdateCard))
	mux.Handle("PATCH /cards/{id}/move", write(h.HandleMoveCard))
	mux.Handle("DELETE /cards/{id}", admin(h.HandleDeleteCard))
}
