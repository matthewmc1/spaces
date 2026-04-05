-- +goose Up

CREATE TABLE integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    space_id        UUID REFERENCES spaces(id),
    provider        TEXT NOT NULL
                    CHECK (provider IN ('github', 'gitlab')),
    name            TEXT NOT NULL,
    config          JSONB NOT NULL DEFAULT '{}',
    access_token    TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'error')),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX idx_integrations_space ON integrations(space_id);

CREATE TABLE card_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id         UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    integration_id  UUID NOT NULL REFERENCES integrations(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    external_type   TEXT NOT NULL
                    CHECK (external_type IN ('pull_request', 'issue', 'branch', 'build', 'commit')),
    external_id     TEXT NOT NULL,
    external_url    TEXT NOT NULL,
    title           TEXT,
    status          TEXT,
    metadata        JSONB DEFAULT '{}',
    last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_links_card ON card_links(card_id);
CREATE INDEX idx_card_links_integration ON card_links(integration_id);
CREATE INDEX idx_card_links_tenant ON card_links(tenant_id);

-- +goose Down
DROP TABLE IF EXISTS card_links;
DROP TABLE IF EXISTS integrations;
