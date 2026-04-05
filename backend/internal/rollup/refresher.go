package rollup

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const refreshInterval = 5 * time.Minute

// StartRefreshLoop launches a goroutine that refreshes the
// space_rollup_stats materialized view every 5 minutes.
// It runs until ctx is canceled.
func StartRefreshLoop(ctx context.Context, db *pgxpool.Pool) {
	go func() {
		// Initial refresh on startup
		refreshOnce(ctx, db)

		ticker := time.NewTicker(refreshInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				slog.Info("rollup refresh loop stopping")
				return
			case <-ticker.C:
				refreshOnce(ctx, db)
			}
		}
	}()
}

func refreshOnce(ctx context.Context, db *pgxpool.Pool) {
	start := time.Now()
	_, err := db.Exec(ctx, `REFRESH MATERIALIZED VIEW CONCURRENTLY space_rollup_stats`)
	if err != nil {
		slog.Warn("rollup materialized view refresh failed", "error", err)
		return
	}
	slog.Info("rollup materialized view refreshed", "duration_ms", time.Since(start).Milliseconds())
}
