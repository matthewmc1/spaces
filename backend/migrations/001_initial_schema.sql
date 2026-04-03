-- +goose Up

-- Tenants
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'free',
    settings    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users
CREATE TABLE users (
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
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- Spaces
CREATE TABLE spaces (
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
CREATE INDEX idx_spaces_tenant ON spaces(tenant_id);
CREATE INDEX idx_spaces_parent ON spaces(parent_space_id);
CREATE INDEX idx_spaces_path ON spaces(path text_pattern_ops);

-- Card Templates (created before cards due to FK)
CREATE TABLE card_templates (
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
CREATE INDEX idx_card_templates_space ON card_templates(space_id);

-- Cards
CREATE TABLE cards (
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
CREATE INDEX idx_cards_space_column ON cards(space_id, column_name);
CREATE INDEX idx_cards_tenant ON cards(tenant_id);
CREATE INDEX idx_cards_assignee ON cards(assignee_id);

-- Attachments
CREATE TABLE attachments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id      UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    url          TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes   BIGINT NOT NULL,
    uploaded_by  UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_card ON attachments(card_id);

-- Comments
CREATE TABLE comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id    UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_card ON comments(card_id);

-- Activity Log
CREATE TABLE activities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    entity_type TEXT NOT NULL,
    entity_id   UUID NOT NULL,
    actor_id    UUID NOT NULL REFERENCES users(id),
    action      TEXT NOT NULL,
    changes     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_tenant_time ON activities(tenant_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS card_templates;
DROP TABLE IF EXISTS spaces;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;
