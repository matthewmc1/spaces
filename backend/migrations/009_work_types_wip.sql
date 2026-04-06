-- +goose Up

-- 1. Add work_type to cards (Mik Kersten's Flow Framework classification)
ALTER TABLE cards ADD COLUMN work_type TEXT NOT NULL DEFAULT 'feature'
    CHECK (work_type IN ('feature', 'defect', 'risk', 'debt'));

-- 2. Add WIP limits and capacity allocation config to spaces
ALTER TABLE spaces ADD COLUMN wip_limits JSONB NOT NULL DEFAULT '{}';
ALTER TABLE spaces ADD COLUMN capacity_targets JSONB NOT NULL DEFAULT '{}';

-- 3. Rebuild materialized view with flow distribution columns
DROP MATERIALIZED VIEW IF EXISTS space_rollup_stats;

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
    COUNT(DISTINCT gl.source_id) FILTER (WHERE gl.source_type = 'card') AS linked_cards,
    COUNT(*) FILTER (WHERE c.work_type = 'feature') AS feature_count,
    COUNT(*) FILTER (WHERE c.work_type = 'defect') AS defect_count,
    COUNT(*) FILTER (WHERE c.work_type = 'risk') AS risk_count,
    COUNT(*) FILTER (WHERE c.work_type = 'debt') AS debt_count
FROM spaces s
LEFT JOIN cards c ON c.space_id = s.id AND c.tenant_id = s.tenant_id
LEFT JOIN goals g ON g.space_id = s.id AND g.tenant_id = s.tenant_id
LEFT JOIN goal_links gl ON gl.target_goal_id = g.id
GROUP BY s.id;

CREATE UNIQUE INDEX idx_space_rollup_stats_space ON space_rollup_stats(space_id);
CREATE INDEX idx_space_rollup_stats_path ON space_rollup_stats(tenant_id, path text_pattern_ops);

-- +goose Down
DROP MATERIALIZED VIEW IF EXISTS space_rollup_stats;
ALTER TABLE spaces DROP COLUMN IF EXISTS capacity_targets;
ALTER TABLE spaces DROP COLUMN IF EXISTS wip_limits;
ALTER TABLE cards DROP COLUMN IF EXISTS work_type;
