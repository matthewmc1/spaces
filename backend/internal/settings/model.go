package settings

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type UserSettings struct {
	ID                uuid.UUID       `json:"id"`
	UserID            uuid.UUID       `json:"user_id"`
	TenantID          uuid.UUID       `json:"tenant_id"`
	Theme             string          `json:"theme"`
	DefaultSpaceID    *uuid.UUID      `json:"default_space_id,omitempty"`
	NotificationPrefs json.RawMessage `json:"notification_prefs"`
	BoardPrefs        json.RawMessage `json:"board_prefs"`
	Timezone          string          `json:"timezone"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

type UpdateInput struct {
	Theme             *string          `json:"theme,omitempty"`
	DefaultSpaceID    *uuid.UUID       `json:"default_space_id,omitempty"`
	NotificationPrefs *json.RawMessage `json:"notification_prefs,omitempty"`
	BoardPrefs        *json.RawMessage `json:"board_prefs,omitempty"`
	Timezone          *string          `json:"timezone,omitempty"`
}
