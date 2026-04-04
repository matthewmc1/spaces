-- +goose Up

CREATE TABLE user_settings (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL UNIQUE REFERENCES users(id),
    tenant_id          UUID NOT NULL REFERENCES tenants(id),
    theme              TEXT NOT NULL DEFAULT 'system'
                       CHECK (theme IN ('light', 'dark', 'system')),
    default_space_id   UUID REFERENCES spaces(id),
    notification_prefs JSONB NOT NULL DEFAULT '{"email_digest":"daily","card_assigned":true,"card_mentioned":true,"card_moved":false,"goal_status_change":true}',
    board_prefs        JSONB NOT NULL DEFAULT '{"compact_mode":false,"show_labels":true,"show_priority":true,"show_assignee":true,"show_due_date":true}',
    timezone           TEXT NOT NULL DEFAULT 'UTC',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_settings_tenant ON user_settings(tenant_id);

-- +goose Down
DROP TABLE IF EXISTS user_settings;
