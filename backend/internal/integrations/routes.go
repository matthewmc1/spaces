package integrations

import "net/http"

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

	mux.Handle("GET /integrations", read(h.HandleListIntegrations))
	mux.Handle("POST /integrations", admin(h.HandleCreateIntegration))
	mux.Handle("PUT /integrations/{id}", admin(h.HandleUpdateIntegration))
	mux.Handle("DELETE /integrations/{id}", admin(h.HandleDeleteIntegration))
	mux.Handle("GET /cards/{id}/links", read(h.HandleListCardLinks))
	mux.Handle("POST /cards/{id}/links", write(h.HandleCreateCardLink))
	mux.Handle("DELETE /card-links/{id}", write(h.HandleDeleteCardLink))
	mux.HandleFunc("POST /webhooks/{provider}", h.HandleWebhook)
}
