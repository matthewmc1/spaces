package goals

import (
	"time"

	"github.com/google/uuid"
)

type Goal struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	SpaceID     uuid.UUID  `json:"space_id"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Status      string     `json:"status"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
	CreatedBy   uuid.UUID  `json:"created_by"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CreateInput struct {
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
}

type UpdateInput struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	Status      *string    `json:"status,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
}

type GoalLink struct {
	ID           uuid.UUID `json:"id"`
	TenantID     uuid.UUID `json:"tenant_id"`
	SourceType   string    `json:"source_type"`
	SourceID     uuid.UUID `json:"source_id"`
	TargetGoalID uuid.UUID `json:"target_goal_id"`
	LinkType     string    `json:"link_type"`
	CreatedAt    time.Time `json:"created_at"`
}

type CreateLinkInput struct {
	SourceType string    `json:"source_type"`
	SourceID   uuid.UUID `json:"source_id"`
	LinkType   string    `json:"link_type"`
}
