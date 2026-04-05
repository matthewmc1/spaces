package programmes

import (
	"time"

	"github.com/google/uuid"
)

type Programme struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	Name        string     `json:"name"`
	Description string     `json:"description,omitempty"`
	Status      string     `json:"status"`
	OwnerID     uuid.UUID  `json:"owner_id"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ProgrammeSpace struct {
	ProgrammeID uuid.UUID `json:"programme_id"`
	SpaceID     uuid.UUID `json:"space_id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	Role        string    `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateInput struct {
	Name        string     `json:"name"`
	Description string     `json:"description,omitempty"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
}

type UpdateInput struct {
	Name        *string    `json:"name,omitempty"`
	Description *string    `json:"description,omitempty"`
	Status      *string    `json:"status,omitempty"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
}

type LinkSpaceInput struct {
	SpaceID uuid.UUID `json:"space_id"`
	Role    string    `json:"role"`
}
