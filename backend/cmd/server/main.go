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
	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/cards"
	"github.com/matthewmcgibbon/spaces/backend/internal/goals"
	"github.com/matthewmcgibbon/spaces/backend/internal/metrics"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/config"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/database"
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

	var tokenVerifier auth.TokenVerifier
	if cfg.ClerkSecretKey != "" {
		tokenVerifier = auth.NewClerkVerifier()
	} else {
		slog.Warn("no CLERK_SECRET_KEY set, using dev auth verifier")
		tokenVerifier = auth.NewDevVerifier(
			uuid.MustParse("00000000-0000-0000-0000-000000000001"),
			uuid.MustParse("00000000-0000-0000-0000-000000000002"),
		)
	}

	spaceRepo := spaces.NewRepository(pool)
	cardRepo := cards.NewRepository(pool)
	goalRepo := goals.NewRepository(pool)

	spaceSvc := spaces.NewService(spaceRepo)
	cardSvc := cards.NewService(cardRepo)
	goalSvc := goals.NewService(goalRepo)
	metricsSvc := metrics.NewService(pool)

	spaceHandler := spaces.NewHandler(spaceSvc)
	cardHandler := cards.NewHandler(cardSvc)
	goalHandler := goals.NewHandler(goalSvc)
	metricsHandler := metrics.NewHandler(metricsSvc)

	router := api.NewRouter(api.Config{
		CORSOrigin:     cfg.CORSOrigin,
		AuthMiddleware: auth.NewMiddleware(tokenVerifier),
		TenantMW:       tenant.NewMiddleware(),
		SpaceHandler:   spaceHandler,
		CardHandler:    cardHandler,
		GoalHandler:    goalHandler,
		MetricsHandler: metricsHandler,
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
