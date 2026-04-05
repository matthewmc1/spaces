package rbac

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *Handler, authMW, tenantMW func(http.Handler) http.Handler, requireAdmin func(http.Handler) http.Handler) {
	read := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}
	admin := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(requireAdmin(fn)))
	}

	mux.Handle("GET /spaces/{id}/members", read(h.HandleListSpaceMembers))
	mux.Handle("POST /spaces/{id}/members", admin(h.HandleAssignSpaceRole))
	mux.Handle("GET /members", read(h.HandleListTenantMembers))
	mux.Handle("DELETE /role-assignments/{id}", admin(h.HandleRevokeRole))
}
