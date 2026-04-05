package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/api"
	"github.com/matthewmcgibbon/spaces/backend/internal/activity"
	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/cards"
	"github.com/matthewmcgibbon/spaces/backend/internal/goals"
	"github.com/matthewmcgibbon/spaces/backend/internal/integrations"
	"github.com/matthewmcgibbon/spaces/backend/internal/programmes"
	"github.com/matthewmcgibbon/spaces/backend/internal/metrics"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/config"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/database"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/redis"
	"github.com/matthewmcgibbon/spaces/backend/internal/rbac"
	"github.com/matthewmcgibbon/spaces/backend/internal/realtime"
	"github.com/matthewmcgibbon/spaces/backend/internal/rollup"
	"github.com/matthewmcgibbon/spaces/backend/internal/settings"
	"github.com/matthewmcgibbon/spaces/backend/internal/spaces"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	redisClient, err := redis.Connect(ctx, cfg.RedisURL)
	if err != nil {
		slog.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer redisClient.Close()

	bus := realtime.NewBus(redisClient)
	hub := realtime.NewHub(bus)

	// Dev verifier is always available as a fallback for the literal "dev-token".
	devVerifier := auth.NewDevVerifier(
		uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		uuid.MustParse("00000000-0000-0000-0000-000000000002"),
	)

	var tokenVerifier auth.TokenVerifier
	if cfg.ClerkSecretKey != "" {
		verifier, err := auth.NewClerkVerifier(ctx, cfg.ClerkPublishableKey)
		if err != nil {
			slog.Error("failed to init clerk verifier", "error", err)
			os.Exit(1)
		}
		// Compound: accept dev-token for local testing, Clerk JWTs for real users.
		tokenVerifier = auth.NewCompoundVerifier(verifier, devVerifier)
	} else {
		slog.Warn("no CLERK_SECRET_KEY set, using dev auth verifier")
		tokenVerifier = devVerifier
	}

	var resolver *auth.Resolver
	if cfg.ClerkSecretKey != "" {
		// Clerk path: we need the resolver to map external_auth_id to local users
		resolver = auth.NewResolver(pool)
	}

	realtimeHandler := realtime.NewHandler(hub, tokenVerifier, cfg.CORSOrigin)

	rbacRepo := rbac.NewRepository(pool)
	rbacSvc := rbac.NewService(rbacRepo)
	rbacHandler := rbac.NewHandler(rbacSvc)

	authRepo := auth.NewRepository(pool)
	authSvc := auth.NewAuthService(pool, authRepo)
	authHandler := auth.NewAuthHandler(authSvc)

	spaceRepo := spaces.NewRepository(pool)
	cardRepo := cards.NewRepository(pool)
	goalRepo := goals.NewRepository(pool)
	settingsRepo := settings.NewRepository(pool)
	integrationsRepo := integrations.NewRepository(pool)
	programmesRepo := programmes.NewRepository(pool)

	activityRepo := activity.NewRepository(pool)

	spaceSvc := spaces.NewService(spaceRepo, bus, activityRepo)
	cardSvc := cards.NewService(cardRepo, bus, activityRepo)
	goalSvc := goals.NewService(goalRepo, bus, activityRepo)
	metricsSvc := metrics.NewService(pool)
	settingsSvc := settings.NewService(settingsRepo)
	integrationsSvc := integrations.NewService(integrationsRepo)
	programmesSvc := programmes.NewService(programmesRepo)

	spaceHandler := spaces.NewHandler(spaceSvc)
	cardHandler := cards.NewHandler(cardSvc)
	goalHandler := goals.NewHandler(goalSvc)
	metricsHandler := metrics.NewHandler(metricsSvc)
	settingsHandler := settings.NewHandler(settingsSvc)
	integrationsHandler := integrations.NewHandler(integrationsSvc)
	programmesHandler := programmes.NewHandler(programmesSvc)

	rollupSvc := rollup.NewService(pool, redisClient)
	rollupHandler := rollup.NewHandler(rollupSvc)

	// Start the materialized view refresh loop (runs until server shutdown)
	rollup.StartRefreshLoop(ctx, pool)

	router := api.NewRouter(api.Config{
		CORSOrigin:          cfg.CORSOrigin,
		AuthMiddleware:      auth.NewMiddleware(tokenVerifier, resolver),
		TenantMW:            tenant.NewMiddleware(),
		RBACService:         rbacSvc,
		RBACHandler:         rbacHandler,
		AuthHandler:         authHandler,
		SpaceHandler:        spaceHandler,
		CardHandler:         cardHandler,
		GoalHandler:         goalHandler,
		MetricsHandler:      metricsHandler,
		SettingsHandler:     settingsHandler,
		IntegrationsHandler: integrationsHandler,
		RealtimeHandler:     realtimeHandler,
		ProgrammesHandler:   programmesHandler,
		RollupHandler:       rollupHandler,
	})

	srv := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("server starting", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
	slog.Info("server stopped")
}
