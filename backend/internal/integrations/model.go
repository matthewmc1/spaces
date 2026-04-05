package integrations

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Integration struct {
	ID        uuid.UUID       `json:"id"`
	TenantID  uuid.UUID       `json:"tenant_id"`
	SpaceID   *uuid.UUID      `json:"space_id,omitempty"`
	Provider  string          `json:"provider"`
	Name      string          `json:"name"`
	Config    json.RawMessage `json:"config"`
	Status    string          `json:"status"`
	CreatedBy uuid.UUID       `json:"created_by"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
	// AccessToken is deliberately omitted from JSON output for security
}

type CreateInput struct {
	SpaceID  *uuid.UUID      `json:"space_id,omitempty"`
	Provider string          `json:"provider"`
	Name     string          `json:"name"`
	Config   json.RawMessage `json:"config,omitempty"`
}

type UpdateInput struct {
	Name   *string          `json:"name,omitempty"`
	Config *json.RawMessage `json:"config,omitempty"`
	Status *string          `json:"status,omitempty"`
}

type CardLink struct {
	ID            uuid.UUID       `json:"id"`
	CardID        uuid.UUID       `json:"card_id"`
	IntegrationID uuid.UUID       `json:"integration_id"`
	TenantID      uuid.UUID       `json:"tenant_id"`
	ExternalType  string          `json:"external_type"`
	ExternalID    string          `json:"external_id"`
	ExternalURL   string          `json:"external_url"`
	Title         string          `json:"title,omitempty"`
	Status        string          `json:"status,omitempty"`
	Metadata      json.RawMessage `json:"metadata,omitempty"`
	LastSyncedAt  time.Time       `json:"last_synced_at"`
	CreatedAt     time.Time       `json:"created_at"`
}

type CreateCardLinkInput struct {
	IntegrationID uuid.UUID `json:"integration_id"`
	ExternalType  string    `json:"external_type"`
	ExternalID    string    `json:"external_id"`
	ExternalURL   string    `json:"external_url"`
	Title         string    `json:"title,omitempty"`
	Status        string    `json:"status,omitempty"`
}
