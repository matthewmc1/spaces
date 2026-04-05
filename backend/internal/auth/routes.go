package auth

import "net/http"

// RegisterRoutes registers all auth lifecycle routes on the given mux.
func RegisterRoutes(mux *http.ServeMux, h *AuthHandler, authMW, tenantMW func(http.Handler) http.Handler, requireAdmin func(http.Handler) http.Handler) {
	authed := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}
	admin := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(requireAdmin(fn)))
	}
	mux.HandleFunc("POST /auth/signup", h.HandleSignup)
	mux.Handle("GET /auth/me", authed(h.HandleMe))
	mux.Handle("GET /auth/users", authed(h.HandleListUsers))
	mux.Handle("POST /auth/users", admin(h.HandleInviteUser))
}
