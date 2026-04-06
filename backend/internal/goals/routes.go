package goals

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

	mux.Handle("GET /goals/{id}/chain", read(h.HandleGetChain))
	mux.Handle("GET /cards/{id}/alignment", read(h.HandleGetCardAlignment))
	mux.Handle("GET /spaces/{id}/goals", read(h.HandleListGoals))
	mux.Handle("POST /spaces/{id}/goals", write(h.HandleCreateGoal))
	mux.Handle("PUT /goals/{id}", write(h.HandleUpdateGoal))
	mux.Handle("DELETE /goals/{id}", admin(h.HandleDeleteGoal))
	mux.Handle("POST /goals/{id}/links", write(h.HandleCreateLink))
	mux.Handle("DELETE /goal-links/{id}", admin(h.HandleDeleteLink))
}
