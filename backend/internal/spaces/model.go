package spaces

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Space struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenant_id"`
	ParentSpaceID *uuid.UUID `json:"parent_space_id,omitempty"`
	Name          string     `json:"name"`
	Description   string     `json:"description,omitempty"`
	Slug          string     `json:"slug"`
	Icon          string     `json:"icon,omitempty"`
	Color         string     `json:"color,omitempty"`
	Path          string     `json:"path"`
	OwnerID       uuid.UUID  `json:"owner_id"`
	Visibility    string     `json:"visibility"`
	SpaceType       string          `json:"space_type"`
	WipLimits       json.RawMessage `json:"wip_limits"`
	CapacityTargets json.RawMessage `json:"capacity_targets"`
	Status          string          `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type CreateInput struct {
	ParentSpaceID *uuid.UUID `json:"parent_space_id,omitempty"`
	Name          string     `json:"name"`
	Description   string     `json:"description,omitempty"`
	Slug          string     `json:"slug"`
	Icon          string     `json:"icon,omitempty"`
	Color         string     `json:"color,omitempty"`
	Visibility    string     `json:"visibility,omitempty"`
	SpaceType     string     `json:"space_type,omitempty"`
}

type UpdateInput struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	Color       *string `json:"color,omitempty"`
	Visibility  *string `json:"visibility,omitempty"`
	Status      *string `json:"status,omitempty"`
	SpaceType       *string          `json:"space_type,omitempty"`
	WipLimits       *json.RawMessage `json:"wip_limits,omitempty"`
	CapacityTargets *json.RawMessage `json:"capacity_targets,omitempty"`
	Path            *string          `json:"-"` // internal use only — not exposed via API
}

type TreeNode struct {
	Space    Space      `json:"space"`
	Children []TreeNode `json:"children,omitempty"`
}
