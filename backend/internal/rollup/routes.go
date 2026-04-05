package rollup

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *Handler, authMW, tenantMW func(http.Handler) http.Handler) {
	read := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}

	mux.Handle("GET /spaces/{id}/rollup", read(h.HandleSpaceRollup))
	mux.Handle("GET /org/rollup", read(h.HandleOrgRollup))
	mux.Handle("GET /programmes/{id}/rollup", read(h.HandleProgrammeRollup))
}
