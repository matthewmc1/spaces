package api

import (
	"net/http"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/cards"
	"github.com/matthewmcgibbon/spaces/backend/internal/goals"
	"github.com/matthewmcgibbon/spaces/backend/internal/metrics"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/middleware"
	"github.com/matthewmcgibbon/spaces/backend/internal/spaces"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

type Config struct {
	CORSOrigin     string
	AuthMiddleware *auth.Middleware
	TenantMW       *tenant.Middleware
	SpaceHandler   *spaces.Handler
	CardHandler    *cards.Handler
	GoalHandler    *goals.Handler
	MetricsHandler *metrics.Handler
}

func NewRouter(cfg Config) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	authMW := cfg.AuthMiddleware.Handler
	tenantMW := cfg.TenantMW.Handler

	spaces.RegisterRoutes(mux, cfg.SpaceHandler, authMW, tenantMW)
	cards.RegisterRoutes(mux, cfg.CardHandler, authMW, tenantMW)
	goals.RegisterRoutes(mux, cfg.GoalHandler, authMW, tenantMW)
	metrics.RegisterRoutes(mux, cfg.MetricsHandler, authMW, tenantMW)

	var handler http.Handler = mux
	handler = middleware.Logging(handler)
	handler = middleware.CORS(cfg.CORSOrigin)(handler)

	return handler
}
