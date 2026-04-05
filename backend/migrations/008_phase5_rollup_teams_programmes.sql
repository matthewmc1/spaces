-- +goose Up

-- 1. Add space_type to spaces
ALTER TABLE spaces ADD COLUMN space_type TEXT NOT NULL DEFAULT 'workstream'
    CHECK (space_type IN ('organization', 'department', 'team', 'workstream'));

-- 2. Backfill: mark the earliest root space per tenant as the organization
UPDATE spaces s SET space_type = 'organization'
WHERE s.parent_space_id IS NULL
  AND s.id = (
    SELECT id FROM spaces
    WHERE tenant_id = s.tenant_id AND parent_space_id IS NULL
    ORDER BY created_at ASC LIMIT 1
  );

-- 3. Programmes table
CREATE TABLE programmes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'completed')),
    owner_id    UUID NOT NULL REFERENCES users(id),
    start_date  DATE,
    target_date DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_programmes_tenant ON programmes(tenant_id);

-- 4. Programme-space join table
CREATE TABLE programme_spaces (
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    space_id     UUID NOT NULL REFERENCES spaces(id),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    role         TEXT NOT NULL DEFAULT 'contributes'
                 CHECK (role IN ('owns', 'contributes')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (programme_id, space_id)
);
CREATE INDEX idx_programme_spaces_space ON programme_spaces(space_id);
CREATE INDEX idx_programme_spaces_tenant ON programme_spaces(tenant_id);

-- 5. Extend goal_links to accept programme source type
ALTER TABLE goal_links DROP CONSTRAINT goal_links_source_type_check;
ALTER TABLE goal_links ADD CONSTRAINT goal_links_source_type_check
    CHECK (source_type IN ('goal', 'card', 'programme'));

-- 6. Materialized view for rollup stats
CREATE MATERIALIZED VIEW space_rollup_stats AS
SELECT
    s.id AS space_id,
    s.tenant_id,
    s.path,
    s.space_type,
    COUNT(c.id) AS total_cards,
    COUNT(*) FILTER (WHERE c.column_name = 'done') AS done_cards,
    COUNT(*) FILTER (WHERE c.column_name IN ('planned','in_progress','review')) AS in_flight,
    COUNT(*) FILTER (WHERE c.priority IN ('p0','p1') AND c.column_name != 'done') AS high_pri_open,
    COALESCE(AVG(EXTRACT(EPOCH FROM (now() - c.moved_at)) / 86400)
        FILTER (WHERE c.column_name != 'done'), 0) AS avg_cycle_days,
    COUNT(DISTINCT g.id) AS total_goals,
    COUNT(DISTINCT gl.source_id) FILTER (WHERE gl.source_type = 'card') AS linked_cards
FROM spaces s
LEFT JOIN cards c ON c.space_id = s.id AND c.tenant_id = s.tenant_id
LEFT JOIN goals g ON g.space_id = s.id AND g.tenant_id = s.tenant_id
LEFT JOIN goal_links gl ON gl.target_goal_id = g.id
GROUP BY s.id;

CREATE UNIQUE INDEX idx_space_rollup_stats_space ON space_rollup_stats(space_id);
CREATE INDEX idx_space_rollup_stats_path ON space_rollup_stats(tenant_id, path text_pattern_ops);

-- +goose Down
DROP MATERIALIZED VIEW IF EXISTS space_rollup_stats;
ALTER TABLE goal_links DROP CONSTRAINT IF EXISTS goal_links_source_type_check;
ALTER TABLE goal_links ADD CONSTRAINT goal_links_source_type_check
    CHECK (source_type IN ('goal', 'card'));
DROP TABLE IF EXISTS programme_spaces;
DROP TABLE IF EXISTS programmes;
ALTER TABLE spaces DROP COLUMN IF EXISTS space_type;
