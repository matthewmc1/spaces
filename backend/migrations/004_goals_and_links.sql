-- +goose Up

CREATE TABLE goals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    space_id    UUID NOT NULL REFERENCES spaces(id),
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'achieved', 'abandoned')),
    target_date DATE,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_space ON goals(space_id);
CREATE INDEX idx_goals_tenant ON goals(tenant_id);

CREATE TABLE goal_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    source_type     TEXT NOT NULL CHECK (source_type IN ('goal', 'card')),
    source_id       UUID NOT NULL,
    target_goal_id  UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    link_type       TEXT NOT NULL DEFAULT 'supports'
                    CHECK (link_type IN ('supports', 'drives', 'blocks')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_type, source_id, target_goal_id)
);
CREATE INDEX idx_goal_links_source ON goal_links(source_type, source_id);
CREATE INDEX idx_goal_links_target ON goal_links(target_goal_id);
CREATE INDEX idx_goal_links_tenant ON goal_links(tenant_id);

-- +goose Down
DROP TABLE IF EXISTS goal_links;
DROP TABLE IF EXISTS goals;
