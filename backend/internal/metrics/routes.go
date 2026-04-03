package metrics

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *Handler, authMW, tenantMW func(http.Handler) http.Handler) {
	wrap := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}
	mux.Handle("GET /spaces/{id}/metrics/flow", wrap(h.HandleFlowMetrics))
	mux.Handle("GET /spaces/{id}/metrics/alignment", wrap(h.HandleAlignmentMetrics))
}
