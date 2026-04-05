package rollup

import "github.com/google/uuid"

type SpaceRollup struct {
	SpaceID        uuid.UUID             `json:"space_id"`
	TenantID       uuid.UUID             `json:"tenant_id"`
	SpaceType      string                `json:"space_type"`
	TotalCards     int                   `json:"total_cards"`
	DoneCards      int                   `json:"done_cards"`
	InFlight       int                   `json:"in_flight"`
	HighPriOpen    int                   `json:"high_pri_open"`
	Completion     float64               `json:"completion_pct"`
	AvgCycleDays   float64               `json:"avg_cycle_days"`
	TotalGoals     int                   `json:"total_goals"`
	LinkedCards    int                   `json:"linked_cards"`
	AlignmentPct   float64               `json:"alignment_pct"`
	ChildBreakdown []SpaceRollupSummary  `json:"child_breakdown,omitempty"`
}

type SpaceRollupSummary struct {
	SpaceID      uuid.UUID `json:"space_id"`
	SpaceType    string    `json:"space_type"`
	TotalCards   int       `json:"total_cards"`
	DoneCards    int       `json:"done_cards"`
	InFlight     int       `json:"in_flight"`
	Completion   float64   `json:"completion_pct"`
	AlignmentPct float64   `json:"alignment_pct"`
}

type ProgrammeRollup struct {
	ProgrammeID  uuid.UUID            `json:"programme_id"`
	TenantID     uuid.UUID            `json:"tenant_id"`
	TotalCards   int                  `json:"total_cards"`
	DoneCards    int                  `json:"done_cards"`
	InFlight     int                  `json:"in_flight"`
	HighPriOpen  int                  `json:"high_pri_open"`
	Completion   float64              `json:"completion_pct"`
	AvgCycleDays float64              `json:"avg_cycle_days"`
	TotalGoals   int                  `json:"total_goals"`
	LinkedCards  int                  `json:"linked_cards"`
	AlignmentPct float64              `json:"alignment_pct"`
	Members      []SpaceRollupSummary `json:"members"`
}
