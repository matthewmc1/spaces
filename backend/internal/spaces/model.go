package spaces

import (
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
}

type UpdateInput struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	Color       *string `json:"color,omitempty"`
	Visibility  *string `json:"visibility,omitempty"`
	Path        *string `json:"-"` // internal use only — not exposed via API
}

type TreeNode struct {
	Space    Space      `json:"space"`
	Children []TreeNode `json:"children,omitempty"`
}
