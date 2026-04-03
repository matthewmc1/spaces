-- +goose Up
-- +goose StatementBegin
-- Dev seed data — only for local development

INSERT INTO tenants (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Org', 'dev-org', 'free')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, tenant_id, external_auth_id, email, name, role)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'dev-user', 'dev@localhost', 'Dev User', 'owner')
ON CONFLICT DO NOTHING;
-- +goose StatementEnd

-- +goose Down
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000002';
DELETE FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001';
