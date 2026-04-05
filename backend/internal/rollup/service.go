package rollup

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

const cacheTTL = 5 * time.Minute

type Service struct {
	db    *pgxpool.Pool
	cache *redis.Client
}

func NewService(db *pgxpool.Pool, cache *redis.Client) *Service {
	return &Service{db: db, cache: cache}
}

// GetSpaceRollup returns aggregated metrics for a space and all its descendants,
// using the materialized space_rollup_stats view + materialized path. Results
// are cached in Redis for 5 minutes.
func (s *Service) GetSpaceRollup(ctx context.Context, tenantID, spaceID uuid.UUID) (*SpaceRollup, error) {
	cacheKey := "rollup:" + tenantID.String() + ":" + spaceID.String()
	if cached := s.getCache(ctx, cacheKey); cached != nil {
		var result SpaceRollup
		if err := json.Unmarshal(cached, &result); err == nil {
			return &result, nil
		}
	}

	// Fetch the root space's path and type
	var rootPath string
	var rootType string
	err := s.db.QueryRow(ctx,
		`SELECT path, space_type FROM space_rollup_stats WHERE tenant_id = $1 AND space_id = $2`,
		tenantID, spaceID,
	).Scan(&rootPath, &rootType)
	if err != nil {
		return nil, err
	}

	// Fetch the space and all descendants from the materialized view
	const q = `
		SELECT space_id, space_type, total_cards, done_cards, in_flight, high_pri_open,
		       avg_cycle_days, total_goals, linked_cards
		FROM space_rollup_stats
		WHERE tenant_id = $1 AND path LIKE $2 || '%'`

	rows, err := s.db.Query(ctx, q, tenantID, rootPath)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := &SpaceRollup{
		SpaceID:   spaceID,
		TenantID:  tenantID,
		SpaceType: rootType,
	}
	var totalCycleSum float64
	var cycleCount int

	for rows.Next() {
		var row struct {
			SpaceID      uuid.UUID
			SpaceType    string
			TotalCards   int
			DoneCards    int
			InFlight     int
			HighPriOpen  int
			AvgCycleDays float64
			TotalGoals   int
			LinkedCards  int
		}
		if err := rows.Scan(&row.SpaceID, &row.SpaceType, &row.TotalCards, &row.DoneCards,
			&row.InFlight, &row.HighPriOpen, &row.AvgCycleDays, &row.TotalGoals, &row.LinkedCards); err != nil {
			return nil, err
		}

		result.TotalCards += row.TotalCards
		result.DoneCards += row.DoneCards
		result.InFlight += row.InFlight
		result.HighPriOpen += row.HighPriOpen
		result.TotalGoals += row.TotalGoals
		result.LinkedCards += row.LinkedCards

		if row.AvgCycleDays > 0 {
			totalCycleSum += row.AvgCycleDays
			cycleCount++
		}

		// Add child rows to breakdown (excluding the root itself)
		if row.SpaceID != spaceID {
			childCompletion := 0.0
			if row.TotalCards > 0 {
				childCompletion = float64(row.DoneCards) / float64(row.TotalCards) * 100
			}
			childAlignment := 0.0
			if row.InFlight > 0 {
				childAlignment = float64(row.LinkedCards) / float64(row.InFlight) * 100
			}
			result.ChildBreakdown = append(result.ChildBreakdown, SpaceRollupSummary{
				SpaceID:      row.SpaceID,
				SpaceType:    row.SpaceType,
				TotalCards:   row.TotalCards,
				DoneCards:    row.DoneCards,
				InFlight:     row.InFlight,
				Completion:   childCompletion,
				AlignmentPct: childAlignment,
			})
		}
	}

	if result.TotalCards > 0 {
		result.Completion = float64(result.DoneCards) / float64(result.TotalCards) * 100
	}
	if result.InFlight > 0 {
		result.AlignmentPct = float64(result.LinkedCards) / float64(result.InFlight) * 100
	}
	if cycleCount > 0 {
		result.AvgCycleDays = totalCycleSum / float64(cycleCount)
	}

	s.setCache(ctx, cacheKey, result)
	return result, nil
}

// GetOrgRollup finds the tenant's organization-type root space and returns its rollup.
// Falls back to the earliest root space if no space is marked organization-type.
func (s *Service) GetOrgRollup(ctx context.Context, tenantID uuid.UUID) (*SpaceRollup, error) {
	var orgID uuid.UUID
	err := s.db.QueryRow(ctx,
		`SELECT id FROM spaces WHERE tenant_id = $1 AND space_type = 'organization' AND parent_space_id IS NULL LIMIT 1`,
		tenantID,
	).Scan(&orgID)
	if err != nil {
		// Fallback: use the earliest root space
		err2 := s.db.QueryRow(ctx,
			`SELECT id FROM spaces WHERE tenant_id = $1 AND parent_space_id IS NULL ORDER BY created_at ASC LIMIT 1`,
			tenantID,
		).Scan(&orgID)
		if err2 != nil {
			return nil, err2
		}
	}
	return s.GetSpaceRollup(ctx, tenantID, orgID)
}

// GetProgrammeRollup aggregates metrics across all spaces linked to a programme.
func (s *Service) GetProgrammeRollup(ctx context.Context, tenantID, programmeID uuid.UUID) (*ProgrammeRollup, error) {
	cacheKey := "rollup:programme:" + tenantID.String() + ":" + programmeID.String()
	if cached := s.getCache(ctx, cacheKey); cached != nil {
		var result ProgrammeRollup
		if err := json.Unmarshal(cached, &result); err == nil {
			return &result, nil
		}
	}

	const q = `
		SELECT srs.space_id, srs.space_type, srs.total_cards, srs.done_cards, srs.in_flight,
		       srs.high_pri_open, srs.avg_cycle_days, srs.total_goals, srs.linked_cards
		FROM space_rollup_stats srs
		JOIN programme_spaces ps ON ps.space_id = srs.space_id
		WHERE srs.tenant_id = $1 AND ps.programme_id = $2`

	rows, err := s.db.Query(ctx, q, tenantID, programmeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := &ProgrammeRollup{ProgrammeID: programmeID, TenantID: tenantID}
	var totalCycleSum float64
	var cycleCount int

	for rows.Next() {
		var row struct {
			SpaceID      uuid.UUID
			SpaceType    string
			TotalCards   int
			DoneCards    int
			InFlight     int
			HighPriOpen  int
			AvgCycleDays float64
			TotalGoals   int
			LinkedCards  int
		}
		if err := rows.Scan(&row.SpaceID, &row.SpaceType, &row.TotalCards, &row.DoneCards,
			&row.InFlight, &row.HighPriOpen, &row.AvgCycleDays, &row.TotalGoals, &row.LinkedCards); err != nil {
			return nil, err
		}

		result.TotalCards += row.TotalCards
		result.DoneCards += row.DoneCards
		result.InFlight += row.InFlight
		result.HighPriOpen += row.HighPriOpen
		result.TotalGoals += row.TotalGoals
		result.LinkedCards += row.LinkedCards

		if row.AvgCycleDays > 0 {
			totalCycleSum += row.AvgCycleDays
			cycleCount++
		}

		memberCompletion := 0.0
		if row.TotalCards > 0 {
			memberCompletion = float64(row.DoneCards) / float64(row.TotalCards) * 100
		}
		memberAlignment := 0.0
		if row.InFlight > 0 {
			memberAlignment = float64(row.LinkedCards) / float64(row.InFlight) * 100
		}
		result.Members = append(result.Members, SpaceRollupSummary{
			SpaceID:      row.SpaceID,
			SpaceType:    row.SpaceType,
			TotalCards:   row.TotalCards,
			DoneCards:    row.DoneCards,
			InFlight:     row.InFlight,
			Completion:   memberCompletion,
			AlignmentPct: memberAlignment,
		})
	}

	if result.TotalCards > 0 {
		result.Completion = float64(result.DoneCards) / float64(result.TotalCards) * 100
	}
	if result.InFlight > 0 {
		result.AlignmentPct = float64(result.LinkedCards) / float64(result.InFlight) * 100
	}
	if cycleCount > 0 {
		result.AvgCycleDays = totalCycleSum / float64(cycleCount)
	}

	s.setCache(ctx, cacheKey, result)
	return result, nil
}

func (s *Service) getCache(ctx context.Context, key string) []byte {
	if s.cache == nil {
		return nil
	}
	data, err := s.cache.Get(ctx, key).Bytes()
	if err != nil {
		return nil
	}
	return data
}

func (s *Service) setCache(ctx context.Context, key string, value any) {
	if s.cache == nil {
		return
	}
	data, err := json.Marshal(value)
	if err != nil {
		slog.Warn("rollup cache marshal failed", "key", key, "error", err)
		return
	}
	if err := s.cache.Set(ctx, key, data, cacheTTL).Err(); err != nil {
		slog.Warn("rollup cache set failed", "key", key, "error", err)
	}
}
