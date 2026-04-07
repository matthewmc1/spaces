-- Auto-run migrations for Spaces.
-- This file is mounted into Postgres /docker-entrypoint-initdb.d/ and runs on first DB init.
-- All statements use IF NOT EXISTS / IF EXISTS for idempotent re-runs.

-- ============================================================
-- 001: Initial Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'free',
    settings    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id),
    external_auth_id  TEXT NOT NULL UNIQUE,
    email             TEXT NOT NULL,
    name              TEXT NOT NULL,
    avatar_url        TEXT,
    role              TEXT NOT NULL DEFAULT 'member'
                      CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

CREATE TABLE IF NOT EXISTS spaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    parent_space_id UUID REFERENCES spaces(id),
    name            TEXT NOT NULL,
    description     TEXT,
    slug            TEXT NOT NULL,
    icon            TEXT,
    color           TEXT,
    path            TEXT NOT NULL,
    owner_id        UUID NOT NULL REFERENCES users(id),
    visibility      TEXT NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public', 'private', 'restricted')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_spaces_tenant ON spaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_spaces_parent ON spaces(parent_space_id);
CREATE INDEX IF NOT EXISTS idx_spaces_path ON spaces(path text_pattern_ops);

CREATE TABLE IF NOT EXISTS card_templates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id                UUID NOT NULL REFERENCES spaces(id),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    name                    TEXT NOT NULL,
    description             TEXT,
    default_labels          TEXT[] DEFAULT '{}',
    default_priority        TEXT CHECK (default_priority IN ('p0', 'p1', 'p2', 'p3')),
    default_effort_estimate INTEGER,
    field_config            JSONB NOT NULL DEFAULT '{}',
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_card_templates_space ON card_templates(space_id);

CREATE TABLE IF NOT EXISTS cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id        UUID NOT NULL REFERENCES spaces(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           TEXT NOT NULL,
    description     TEXT,
    column_name     TEXT NOT NULL DEFAULT 'inbox'
                    CHECK (column_name IN ('inbox', 'icebox', 'freezer', 'planned',
                                           'in_progress', 'review', 'done')),
    position        DOUBLE PRECISION NOT NULL DEFAULT 0,
    assignee_id     UUID REFERENCES users(id),
    priority        TEXT CHECK (priority IN ('p0', 'p1', 'p2', 'p3')),
    effort_estimate INTEGER,
    due_date        DATE,
    labels          TEXT[] DEFAULT '{}',
    template_id     UUID REFERENCES card_templates(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    moved_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cards_space_column ON cards(space_id, column_name);
CREATE INDEX IF NOT EXISTS idx_cards_tenant ON cards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cards_assignee ON cards(assignee_id);

CREATE TABLE IF NOT EXISTS attachments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id      UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    url          TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes   BIGINT NOT NULL,
    uploaded_by  UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attachments_card ON attachments(card_id);

CREATE TABLE IF NOT EXISTS comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id    UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);

CREATE TABLE IF NOT EXISTS activities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    entity_type TEXT NOT NULL,
    entity_id   UUID NOT NULL,
    actor_id    UUID NOT NULL REFERENCES users(id),
    action      TEXT NOT NULL,
    changes     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant_time ON activities(tenant_id, created_at DESC);

-- ============================================================
-- 002: Dev Seed
-- ============================================================

INSERT INTO tenants (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Org', 'dev-org', 'free')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, tenant_id, external_auth_id, email, name, role)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'dev-user', 'dev@localhost', 'Dev User', 'owner')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 003: Space Status
-- ============================================================

DO $$ BEGIN
  ALTER TABLE spaces ADD COLUMN status TEXT NOT NULL DEFAULT 'on_track'
      CHECK (status IN ('on_track', 'at_risk', 'behind', 'paused'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 004: Goals and Goal Links
-- ============================================================

CREATE TABLE IF NOT EXISTS goals (
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
CREATE INDEX IF NOT EXISTS idx_goals_space ON goals(space_id);
CREATE INDEX IF NOT EXISTS idx_goals_tenant ON goals(tenant_id);

CREATE TABLE IF NOT EXISTS goal_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    source_type     TEXT NOT NULL CHECK (source_type IN ('goal', 'card', 'programme')),
    source_id       UUID NOT NULL,
    target_goal_id  UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    link_type       TEXT NOT NULL DEFAULT 'supports'
                    CHECK (link_type IN ('supports', 'drives', 'blocks')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_type, source_id, target_goal_id)
);
CREATE INDEX IF NOT EXISTS idx_goal_links_source ON goal_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_goal_links_target ON goal_links(target_goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_links_tenant ON goal_links(tenant_id);

-- ============================================================
-- 005: Role Assignments
-- ============================================================

CREATE TABLE IF NOT EXISTS role_assignments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id),
    user_id    UUID NOT NULL REFERENCES users(id),
    space_id   UUID REFERENCES spaces(id),
    role       TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id, space_id)
);
CREATE INDEX IF NOT EXISTS idx_role_assignments_user ON role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_space ON role_assignments(space_id);

-- ============================================================
-- 006: User Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS user_settings (
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
CREATE INDEX IF NOT EXISTS idx_user_settings_tenant ON user_settings(tenant_id);

-- ============================================================
-- 007: Integrations
-- ============================================================

CREATE TABLE IF NOT EXISTS integrations (
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
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_space ON integrations(space_id);

CREATE TABLE IF NOT EXISTS card_links (
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
CREATE INDEX IF NOT EXISTS idx_card_links_card ON card_links(card_id);
CREATE INDEX IF NOT EXISTS idx_card_links_integration ON card_links(integration_id);
CREATE INDEX IF NOT EXISTS idx_card_links_tenant ON card_links(tenant_id);

-- ============================================================
-- 008: Phase 5 — Space Types, Programmes, Materialized View
-- ============================================================

DO $$ BEGIN
  ALTER TABLE spaces ADD COLUMN space_type TEXT NOT NULL DEFAULT 'workstream'
      CHECK (space_type IN ('organization', 'department', 'team', 'workstream'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS programmes (
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
CREATE INDEX IF NOT EXISTS idx_programmes_tenant ON programmes(tenant_id);

CREATE TABLE IF NOT EXISTS programme_spaces (
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    space_id     UUID NOT NULL REFERENCES spaces(id),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    role         TEXT NOT NULL DEFAULT 'contributes'
                 CHECK (role IN ('owns', 'contributes')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (programme_id, space_id)
);
CREATE INDEX IF NOT EXISTS idx_programme_spaces_space ON programme_spaces(space_id);
CREATE INDEX IF NOT EXISTS idx_programme_spaces_tenant ON programme_spaces(tenant_id);

-- ============================================================
-- 009: Work Types & WIP
-- ============================================================

DO $$ BEGIN
  ALTER TABLE cards ADD COLUMN work_type TEXT NOT NULL DEFAULT 'feature'
      CHECK (work_type IN ('feature', 'defect', 'risk', 'debt'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE spaces ADD COLUMN wip_limits JSONB NOT NULL DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE spaces ADD COLUMN capacity_targets JSONB NOT NULL DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- Materialized View (always recreate to pick up latest columns)
-- ============================================================

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_space_rollup_stats_space ON space_rollup_stats(space_id);
CREATE INDEX IF NOT EXISTS idx_space_rollup_stats_path ON space_rollup_stats(tenant_id, path text_pattern_ops);

-- Backfill: mark first root space per tenant as organization
UPDATE spaces s SET space_type = 'organization'
WHERE s.parent_space_id IS NULL AND s.space_type = 'workstream'
  AND s.id = (
    SELECT id FROM spaces
    WHERE tenant_id = s.tenant_id AND parent_space_id IS NULL
    ORDER BY created_at ASC LIMIT 1
  );
