package settings

import "net/http"

// RegisterRoutes registers all settings-related routes on the given mux.
func RegisterRoutes(mux *http.ServeMux, h *Handler, authMW, tenantMW func(http.Handler) http.Handler) {
	wrap := func(fn http.HandlerFunc) http.Handler { return authMW(tenantMW(fn)) }
	mux.Handle("GET /settings", wrap(h.HandleGetSettings))
	mux.Handle("PUT /settings", wrap(h.HandleUpdateSettings))
}
