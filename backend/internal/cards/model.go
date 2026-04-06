package cards

import (
	"time"

	"github.com/google/uuid"
)

type Column string

const (
	ColumnInbox      Column = "inbox"
	ColumnIcebox     Column = "icebox"
	ColumnFreezer    Column = "freezer"
	ColumnPlanned    Column = "planned"
	ColumnInProgress Column = "in_progress"
	ColumnReview     Column = "review"
	ColumnDone       Column = "done"
)

type Card struct {
	ID             uuid.UUID  `json:"id"`
	SpaceID        uuid.UUID  `json:"space_id"`
	TenantID       uuid.UUID  `json:"tenant_id"`
	Title          string     `json:"title"`
	Description    string     `json:"description,omitempty"`
	ColumnName     Column     `json:"column_name"`
	Position       float64    `json:"position"`
	AssigneeID     *uuid.UUID `json:"assignee_id,omitempty"`
	Priority       *string    `json:"priority,omitempty"`
	EffortEstimate *int       `json:"effort_estimate,omitempty"`
	DueDate        *time.Time `json:"due_date,omitempty"`
	Labels         []string   `json:"labels"`
	WorkType       string     `json:"work_type"`
	CreatedBy      uuid.UUID  `json:"created_by"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	MovedAt        time.Time  `json:"moved_at"`
}

type CreateInput struct {
	Title          string     `json:"title"`
	Description    string     `json:"description,omitempty"`
	Priority       string     `json:"priority,omitempty"`
	EffortEstimate *int       `json:"effort_estimate,omitempty"`
	DueDate        *time.Time `json:"due_date,omitempty"`
	Labels         []string   `json:"labels,omitempty"`
	WorkType       string     `json:"work_type,omitempty"`
	AssigneeID     *uuid.UUID `json:"assignee_id,omitempty"`
}

type UpdateInput struct {
	Title          *string    `json:"title,omitempty"`
	Description    *string    `json:"description,omitempty"`
	Priority       *string    `json:"priority,omitempty"`
	EffortEstimate *int       `json:"effort_estimate,omitempty"`
	DueDate        *time.Time `json:"due_date,omitempty"`
	Labels         []string   `json:"labels,omitempty"`
	WorkType       *string    `json:"work_type,omitempty"`
	AssigneeID     *uuid.UUID `json:"assignee_id,omitempty"`
}

type MoveInput struct {
	Column   Column  `json:"column"`
	Position float64 `json:"position"`
}

type ListFilters struct {
	Column   Column
	Assignee *uuid.UUID
	Priority string
}
