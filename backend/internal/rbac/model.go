package rbac

import (
	"time"

	"github.com/google/uuid"
)

type RoleAssignment struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenant_id"`
	UserID    uuid.UUID  `json:"user_id"`
	SpaceID   *uuid.UUID `json:"space_id,omitempty"`
	Role      string     `json:"role"`
	CreatedAt time.Time  `json:"created_at"`
}

// Role hierarchy: owner > admin > member > viewer
var roleLevel = map[string]int{
	"viewer": 0,
	"member": 1,
	"admin":  2,
	"owner":  3,
}

// HasAtLeast checks if role meets or exceeds the required level.
func HasAtLeast(role, required string) bool {
	return roleLevel[role] >= roleLevel[required]
}
