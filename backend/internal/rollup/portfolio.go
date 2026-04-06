package rollup

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type PortfolioItem struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	ItemType     string    `json:"item_type"` // "programme" or "space"
	Status       string    `json:"status"`
	SpaceType    string    `json:"space_type,omitempty"`
	TotalCards   int       `json:"total_cards"`
	DoneCards    int       `json:"done_cards"`
	InFlight     int       `json:"in_flight"`
	HighPriOpen  int       `json:"high_pri_open"`
	Completion   float64   `json:"completion_pct"`
	AlignmentPct float64   `json:"alignment_pct"`
	OwnerID      uuid.UUID `json:"owner_id"`
	TargetDate   *string   `json:"target_date,omitempty"`
	Health       string    `json:"health"` // "green", "amber", "red"
}

type PortfolioResult struct {
	Items      []PortfolioItem `json:"items"`
	WIPLimit   int             `json:"wip_limit"`
	WIPCurrent int             `json:"wip_current"`
}

// computeHealth determines a health status based on completion and high-priority open items.
func computeHealth(completion float64, highPriOpen int, avgCycleDays float64) string {
	if completion < 25 || highPriOpen > 5 || avgCycleDays > 14 {
		return "red"
	}
	if completion < 50 || highPriOpen > 2 || avgCycleDays > 7 {
		return "amber"
	}
	return "green"
}

// GetPortfolio returns a unified view of all active programmes and top-level
// department/team spaces for a tenant, each with aggregated metrics and health status.
func (s *Service) GetPortfolio(ctx context.Context, tenantID uuid.UUID) (*PortfolioResult, error) {
	result := &PortfolioResult{
		WIPLimit: 10, // Default org-level WIP limit for portfolio items
	}

	// 1. Active programmes with their rollup stats
	const progQ = `
		SELECT
			p.id, p.name, p.status, p.owner_id, p.target_date,
			COALESCE(SUM(srs.total_cards), 0) AS total_cards,
			COALESCE(SUM(srs.done_cards), 0) AS done_cards,
			COALESCE(SUM(srs.in_flight), 0) AS in_flight,
			COALESCE(SUM(srs.high_pri_open), 0) AS high_pri_open,
			CASE WHEN COALESCE(SUM(srs.total_cards), 0) > 0
				THEN SUM(srs.done_cards)::float / SUM(srs.total_cards) * 100
				ELSE 0
			END AS completion,
			CASE WHEN COALESCE(SUM(srs.in_flight), 0) > 0
				THEN SUM(srs.linked_cards)::float / SUM(srs.in_flight) * 100
				ELSE 0
			END AS alignment,
			COALESCE(AVG(srs.avg_cycle_days) FILTER (WHERE srs.avg_cycle_days > 0), 0) AS avg_cycle
		FROM programmes p
		LEFT JOIN programme_spaces ps ON ps.programme_id = p.id
		LEFT JOIN space_rollup_stats srs ON srs.space_id = ps.space_id
		WHERE p.tenant_id = $1 AND p.status = 'active'
		GROUP BY p.id`

	progRows, err := s.db.Query(ctx, progQ, tenantID)
	if err != nil {
		return nil, err
	}
	defer progRows.Close()

	for progRows.Next() {
		var item PortfolioItem
		var targetDate *time.Time
		var avgCycle float64
		if err := progRows.Scan(
			&item.ID, &item.Name, &item.Status, &item.OwnerID, &targetDate,
			&item.TotalCards, &item.DoneCards, &item.InFlight, &item.HighPriOpen,
			&item.Completion, &item.AlignmentPct, &avgCycle,
		); err != nil {
			return nil, err
		}
		item.ItemType = "programme"
		if targetDate != nil {
			s := targetDate.Format("2006-01-02")
			item.TargetDate = &s
		}
		item.Health = computeHealth(item.Completion, item.HighPriOpen, avgCycle)
		result.Items = append(result.Items, item)
	}
	if err := progRows.Err(); err != nil {
		return nil, err
	}

	// 2. Top-level department/team spaces (not workstreams — those are too granular for FL3)
	const spaceQ = `
		SELECT
			srs.space_id, s.name, s.status, s.space_type, s.owner_id,
			srs.total_cards, srs.done_cards, srs.in_flight, srs.high_pri_open,
			CASE WHEN srs.total_cards > 0 THEN srs.done_cards::float / srs.total_cards * 100 ELSE 0 END AS completion,
			CASE WHEN srs.in_flight > 0 THEN srs.linked_cards::float / srs.in_flight * 100 ELSE 0 END AS alignment,
			srs.avg_cycle_days
		FROM space_rollup_stats srs
		JOIN spaces s ON s.id = srs.space_id
		WHERE srs.tenant_id = $1 AND s.space_type IN ('department', 'team')
		  AND s.parent_space_id IS NOT NULL`

	spaceRows, err := s.db.Query(ctx, spaceQ, tenantID)
	if err != nil {
		return nil, err
	}
	defer spaceRows.Close()

	for spaceRows.Next() {
		var item PortfolioItem
		var avgCycle float64
		if err := spaceRows.Scan(
			&item.ID, &item.Name, &item.Status, &item.SpaceType, &item.OwnerID,
			&item.TotalCards, &item.DoneCards, &item.InFlight, &item.HighPriOpen,
			&item.Completion, &item.AlignmentPct, &avgCycle,
		); err != nil {
			return nil, err
		}
		item.ItemType = "space"
		item.Health = computeHealth(item.Completion, item.HighPriOpen, avgCycle)
		result.Items = append(result.Items, item)
	}
	if err := spaceRows.Err(); err != nil {
		return nil, err
	}

	result.WIPCurrent = len(result.Items)

	// Sort: red first, then amber, then green
	healthOrder := map[string]int{"red": 0, "amber": 1, "green": 2}
	for i := 0; i < len(result.Items); i++ {
		for j := i + 1; j < len(result.Items); j++ {
			if healthOrder[result.Items[i].Health] > healthOrder[result.Items[j].Health] {
				result.Items[i], result.Items[j] = result.Items[j], result.Items[i]
			}
		}
	}

	if result.Items == nil {
		result.Items = []PortfolioItem{}
	}

	return result, nil
}
