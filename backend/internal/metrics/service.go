package metrics

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FlowResult struct {
	InFlight       int             `json:"in_flight"`
	AvgCycleTime   float64         `json:"avg_cycle_time_days"`
	Throughput     int             `json:"throughput"`
	Completion     float64         `json:"completion_pct"`
	ByColumn       map[string]int  `json:"by_column"`
	CumulativeFlow []DailySnapshot `json:"cumulative_flow"`
}

type DailySnapshot struct {
	Date    string         `json:"date"`
	Columns map[string]int `json:"columns"`
}

type AlignmentResult struct {
	LinkedPct       float64        `json:"linked_pct"`
	LinkedCount     int            `json:"linked_count"`
	TotalInFlight   int            `json:"total_in_flight"`
	OrphanedGoals   []OrphanedGoal `json:"orphaned_goals"`
	UnlinkedHighPri []UnlinkedCard `json:"unlinked_high_pri"`
}

type OrphanedGoal struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
}

type UnlinkedCard struct {
	ID       uuid.UUID `json:"id"`
	Title    string    `json:"title"`
	Priority string    `json:"priority"`
}

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

func (s *Service) FlowMetrics(ctx context.Context, tenantID, spaceID uuid.UUID) (*FlowResult, error) {
	// Query card counts per column.
	colRows, err := s.db.Query(ctx,
		`SELECT column_name, COUNT(*) FROM cards WHERE tenant_id=$1 AND space_id=$2 GROUP BY column_name`,
		tenantID, spaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("metrics: query columns: %w", err)
	}
	defer colRows.Close()

	byColumn := make(map[string]int)
	for colRows.Next() {
		var col string
		var cnt int
		if err := colRows.Scan(&col, &cnt); err != nil {
			return nil, fmt.Errorf("metrics: scan column: %w", err)
		}
		byColumn[col] = cnt
	}
	if err := colRows.Err(); err != nil {
		return nil, fmt.Errorf("metrics: columns rows: %w", err)
	}

	inFlight := byColumn["planned"] + byColumn["in_progress"] + byColumn["review"]
	throughput := byColumn["done"]
	total := 0
	for _, v := range byColumn {
		total += v
	}
	var completion float64
	if total > 0 {
		completion = float64(throughput) / float64(total) * 100
	}

	// Compute avg cycle time for in-flight cards.
	var avgCycleTime float64
	err = s.db.QueryRow(ctx,
		`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (now() - moved_at)) / 86400), 0)
		 FROM cards
		 WHERE tenant_id=$1 AND space_id=$2 AND column_name IN ('planned','in_progress','review')`,
		tenantID, spaceID,
	).Scan(&avgCycleTime)
	if err != nil {
		return nil, fmt.Errorf("metrics: avg cycle time: %w", err)
	}

	// Build cumulative flow from last 30 days of movement activity.
	flowRows, err := s.db.Query(ctx,
		`SELECT DATE(moved_at) AS day, column_name, COUNT(*)
		 FROM cards
		 WHERE tenant_id=$1 AND space_id=$2 AND moved_at >= now() - interval '30 days'
		 GROUP BY day, column_name
		 ORDER BY day`,
		tenantID, spaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("metrics: cumulative flow query: %w", err)
	}
	defer flowRows.Close()

	// Accumulate per-day snapshots.
	snapshotMap := make(map[string]map[string]int)
	var dayOrder []string
	seen := make(map[string]bool)
	for flowRows.Next() {
		var day time.Time
		var col string
		var cnt int
		if err := flowRows.Scan(&day, &col, &cnt); err != nil {
			return nil, fmt.Errorf("metrics: scan flow row: %w", err)
		}
		key := day.Format("2006-01-02")
		if !seen[key] {
			seen[key] = true
			dayOrder = append(dayOrder, key)
			snapshotMap[key] = make(map[string]int)
		}
		snapshotMap[key][col] = cnt
	}
	if err := flowRows.Err(); err != nil {
		return nil, fmt.Errorf("metrics: flow rows: %w", err)
	}

	snapshots := make([]DailySnapshot, 0, len(dayOrder))
	for _, day := range dayOrder {
		snapshots = append(snapshots, DailySnapshot{
			Date:    day,
			Columns: snapshotMap[day],
		})
	}

	return &FlowResult{
		InFlight:       inFlight,
		AvgCycleTime:   avgCycleTime,
		Throughput:     throughput,
		Completion:     completion,
		ByColumn:       byColumn,
		CumulativeFlow: snapshots,
	}, nil
}

func (s *Service) AlignmentMetrics(ctx context.Context, tenantID, spaceID uuid.UUID) (*AlignmentResult, error) {
	// Count in-flight cards and how many are linked to goals.
	var total, linked int
	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) AS total,
		        COUNT(DISTINCT CASE WHEN gl.id IS NOT NULL THEN c.id END) AS linked
		 FROM cards c
		 LEFT JOIN goal_links gl ON gl.source_type = 'card' AND gl.source_id = c.id AND gl.tenant_id = c.tenant_id
		 WHERE c.tenant_id = $1 AND c.space_id = $2 AND c.column_name IN ('planned','in_progress','review')`,
		tenantID, spaceID,
	).Scan(&total, &linked)
	if err != nil {
		return nil, fmt.Errorf("metrics: alignment counts: %w", err)
	}

	var linkedPct float64
	if total > 0 {
		linkedPct = float64(linked) / float64(total) * 100
	}

	// Find orphaned goals (active goals with no links).
	goalRows, err := s.db.Query(ctx,
		`SELECT g.id, g.title FROM goals g
		 LEFT JOIN goal_links gl ON gl.target_goal_id = g.id
		 WHERE g.tenant_id = $1 AND g.space_id = $2 AND g.status = 'active'
		 GROUP BY g.id, g.title
		 HAVING COUNT(gl.id) = 0`,
		tenantID, spaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("metrics: orphaned goals: %w", err)
	}
	defer goalRows.Close()

	var orphaned []OrphanedGoal
	for goalRows.Next() {
		var og OrphanedGoal
		if err := goalRows.Scan(&og.ID, &og.Title); err != nil {
			return nil, fmt.Errorf("metrics: scan orphaned goal: %w", err)
		}
		orphaned = append(orphaned, og)
	}
	if err := goalRows.Err(); err != nil {
		return nil, fmt.Errorf("metrics: orphaned goals rows: %w", err)
	}
	if orphaned == nil {
		orphaned = []OrphanedGoal{}
	}

	// Find unlinked high-priority cards.
	cardRows, err := s.db.Query(ctx,
		`SELECT c.id, c.title, c.priority FROM cards c
		 LEFT JOIN goal_links gl ON gl.source_type = 'card' AND gl.source_id = c.id AND gl.tenant_id = c.tenant_id
		 WHERE c.tenant_id = $1 AND c.space_id = $2
		   AND c.priority IN ('p0','p1')
		   AND c.column_name != 'done'
		   AND gl.id IS NULL`,
		tenantID, spaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("metrics: unlinked high-pri cards: %w", err)
	}
	defer cardRows.Close()

	var unlinked []UnlinkedCard
	for cardRows.Next() {
		var uc UnlinkedCard
		if err := cardRows.Scan(&uc.ID, &uc.Title, &uc.Priority); err != nil {
			return nil, fmt.Errorf("metrics: scan unlinked card: %w", err)
		}
		unlinked = append(unlinked, uc)
	}
	if err := cardRows.Err(); err != nil {
		return nil, fmt.Errorf("metrics: unlinked cards rows: %w", err)
	}
	if unlinked == nil {
		unlinked = []UnlinkedCard{}
	}

	return &AlignmentResult{
		LinkedPct:       linkedPct,
		LinkedCount:     linked,
		TotalInFlight:   total,
		OrphanedGoals:   orphaned,
		UnlinkedHighPri: unlinked,
	}, nil
}
