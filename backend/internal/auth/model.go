package auth

import (
	"time"

	"github.com/google/uuid"
)

// Claims holds the decoded JWT/token claims for an authenticated user.
type Claims struct {
	UserID         uuid.UUID
	TenantID       uuid.UUID
	ExternalAuthID string
	Email          string
	Role           string
}

// User represents an authenticated user record in the database.
type User struct {
	ID             uuid.UUID `json:"id"`
	TenantID       uuid.UUID `json:"tenant_id"`
	ExternalAuthID string    `json:"external_auth_id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	AvatarURL      string    `json:"avatar_url,omitempty"`
	Role           string    `json:"role"`
	CreatedAt      time.Time `json:"created_at"`
}
