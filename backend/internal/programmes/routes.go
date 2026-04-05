package programmes

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *Handler, authMW, tenantMW func(http.Handler) http.Handler, requireAdmin func(http.Handler) http.Handler) {
	read := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}
	admin := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(requireAdmin(fn)))
	}

	mux.Handle("GET /programmes", read(h.HandleListProgrammes))
	mux.Handle("GET /programmes/{id}", read(h.HandleGetProgramme))
	mux.Handle("POST /programmes", admin(h.HandleCreateProgramme))
	mux.Handle("PUT /programmes/{id}", admin(h.HandleUpdateProgramme))
	mux.Handle("DELETE /programmes/{id}", admin(h.HandleDeleteProgramme))
	mux.Handle("GET /programmes/{id}/spaces", read(h.HandleListSpaces))
	mux.Handle("POST /programmes/{id}/spaces", admin(h.HandleLinkSpace))
	mux.Handle("DELETE /programmes/{id}/spaces/{spaceId}", admin(h.HandleUnlinkSpace))
	mux.Handle("GET /spaces/{id}/programmes", read(h.HandleListProgrammesForSpace))
}
