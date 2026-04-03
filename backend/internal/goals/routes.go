package goals

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *Handler, authMW, tenantMW func(http.Handler) http.Handler) {
	wrap := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}
	mux.Handle("GET /spaces/{id}/goals", wrap(h.HandleListGoals))
	mux.Handle("POST /spaces/{id}/goals", wrap(h.HandleCreateGoal))
	mux.Handle("PUT /goals/{id}", wrap(h.HandleUpdateGoal))
	mux.Handle("DELETE /goals/{id}", wrap(h.HandleDeleteGoal))
	mux.Handle("POST /goals/{id}/links", wrap(h.HandleCreateLink))
	mux.Handle("DELETE /goal-links/{id}", wrap(h.HandleDeleteLink))
}
