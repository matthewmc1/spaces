-- Phase 5 demo seed: creates a realistic end-to-end org structure for the dev tenant.
-- Run: docker exec -i spaces-postgres-1 psql -U spaces -d spaces < backend/migrations/seed_phase5_demo.sql
--
-- Structure:
--   Acme Inc (organization)
--     ├─ Engineering (department)
--     │   ├─ Platform Team (team)
--     │   │   ├─ Auth Rewrite (workstream)
--     │   │   └─ Observability (workstream)
--     │   └─ Product Team (team)
--     │       ├─ Checkout Flow (workstream)
--     │       └─ Mobile App (workstream)
--     └─ Design & Research (department)
--         └─ UX Team (team)
--             ├─ Design System (workstream)
--             └─ User Research (workstream)
--
-- Programmes (cross-cutting):
--   - Identity Platform 2026: Auth Rewrite + Design System
--   - Mobile Launch Q2: Mobile App + Checkout Flow + User Research

-- Clean up previous demo data for this tenant (idempotent)
DELETE FROM goal_links WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM goals WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM cards WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM programme_spaces WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM programmes WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM spaces WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- Ensure tenant + user still exist
INSERT INTO tenants (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Org', 'dev-org', 'free')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, tenant_id, external_auth_id, email, name, role)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
        'dev-user', 'dev@localhost', 'Dev User', 'owner')
ON CONFLICT DO NOTHING;

-- Use fixed UUIDs so we can reference them below without subqueries everywhere
DO $$
DECLARE
    tid UUID := '00000000-0000-0000-0000-000000000001';
    uid UUID := '00000000-0000-0000-0000-000000000002';

    org_id UUID := 'aaaa0000-0000-0000-0000-000000000001';
    eng_id UUID := 'aaaa0000-0000-0000-0000-000000000002';
    design_dept_id UUID := 'aaaa0000-0000-0000-0000-000000000003';
    platform_id UUID := 'aaaa0000-0000-0000-0000-000000000004';
    product_id UUID := 'aaaa0000-0000-0000-0000-000000000005';
    ux_id UUID := 'aaaa0000-0000-0000-0000-000000000006';
    auth_id UUID := 'aaaa0000-0000-0000-0000-000000000007';
    obs_id UUID := 'aaaa0000-0000-0000-0000-000000000008';
    checkout_id UUID := 'aaaa0000-0000-0000-0000-000000000009';
    mobile_id UUID := 'aaaa0000-0000-0000-0000-00000000000a';
    ds_id UUID := 'aaaa0000-0000-0000-0000-00000000000b';
    research_id UUID := 'aaaa0000-0000-0000-0000-00000000000c';

    prog_identity_id UUID := 'bbbb0000-0000-0000-0000-000000000001';
    prog_mobile_id UUID := 'bbbb0000-0000-0000-0000-000000000002';
BEGIN
    -- Organization root
    INSERT INTO spaces (id, tenant_id, name, slug, description, path, owner_id, visibility, space_type, status)
    VALUES (org_id, tid, 'Acme Inc', 'acme', 'Fictional demo organization', '/' || org_id || '/', uid, 'public', 'organization', 'on_track');

    -- Departments
    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (eng_id, tid, org_id, 'Engineering', 'engineering', 'Platform and product engineering',
     '/' || org_id || '/' || eng_id || '/', uid, 'public', 'department', 'on_track'),
    (design_dept_id, tid, org_id, 'Design & Research', 'design', 'Product design and user research',
     '/' || org_id || '/' || design_dept_id || '/', uid, 'public', 'department', 'on_track');

    -- Teams under Engineering
    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (platform_id, tid, eng_id, 'Platform Team', 'platform', 'Infrastructure and core services',
     '/' || org_id || '/' || eng_id || '/' || platform_id || '/', uid, 'public', 'team', 'on_track'),
    (product_id, tid, eng_id, 'Product Team', 'product', 'Customer-facing features',
     '/' || org_id || '/' || eng_id || '/' || product_id || '/', uid, 'public', 'team', 'at_risk');

    -- Team under Design
    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (ux_id, tid, design_dept_id, 'UX Team', 'ux', 'Design systems and research',
     '/' || org_id || '/' || design_dept_id || '/' || ux_id || '/', uid, 'public', 'team', 'on_track');

    -- Workstreams under Platform Team
    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (auth_id, tid, platform_id, 'Auth Rewrite', 'auth-rewrite', 'Migrate auth to new identity platform',
     '/' || org_id || '/' || eng_id || '/' || platform_id || '/' || auth_id || '/', uid, 'public', 'workstream', 'on_track'),
    (obs_id, tid, platform_id, 'Observability', 'observability', 'Metrics, logs, tracing rollout',
     '/' || org_id || '/' || eng_id || '/' || platform_id || '/' || obs_id || '/', uid, 'public', 'workstream', 'on_track');

    -- Workstreams under Product Team
    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (checkout_id, tid, product_id, 'Checkout Flow', 'checkout', 'New checkout experience',
     '/' || org_id || '/' || eng_id || '/' || product_id || '/' || checkout_id || '/', uid, 'public', 'workstream', 'behind'),
    (mobile_id, tid, product_id, 'Mobile App', 'mobile', 'iOS and Android client',
     '/' || org_id || '/' || eng_id || '/' || product_id || '/' || mobile_id || '/', uid, 'public', 'workstream', 'at_risk');

    -- Workstreams under UX Team
    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (ds_id, tid, ux_id, 'Design System', 'design-system', 'Component library and tokens',
     '/' || org_id || '/' || design_dept_id || '/' || ux_id || '/' || ds_id || '/', uid, 'public', 'workstream', 'on_track'),
    (research_id, tid, ux_id, 'User Research', 'research', 'Ongoing user interviews and testing',
     '/' || org_id || '/' || design_dept_id || '/' || ux_id || '/' || research_id || '/', uid, 'public', 'workstream', 'on_track');

    -- Programmes (cross-cutting initiatives)
    INSERT INTO programmes (id, tenant_id, name, description, status, owner_id, start_date, target_date)
    VALUES
    (prog_identity_id, tid, 'Identity Platform 2026',
     'Modernize authentication across all products with a unified identity layer. Spans Auth Rewrite and Design System work.',
     'active', uid, '2026-01-15', '2026-06-30'),
    (prog_mobile_id, tid, 'Mobile Launch Q2',
     'Ship native mobile clients with new checkout flow backed by fresh user research.',
     'active', uid, '2026-02-01', '2026-05-31');

    -- Link spaces to programmes
    INSERT INTO programme_spaces (programme_id, space_id, tenant_id, role) VALUES
    (prog_identity_id, auth_id, tid, 'owns'),
    (prog_identity_id, ds_id, tid, 'contributes'),
    (prog_mobile_id, mobile_id, tid, 'owns'),
    (prog_mobile_id, checkout_id, tid, 'contributes'),
    (prog_mobile_id, research_id, tid, 'contributes');

    -- Cards distributed across workstreams and columns
    -- Auth Rewrite (on_track, healthy flow)
    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, auth_id, uid, 'Design JWT claims schema', 'done', 1000, 'p1', now() - interval '21 days'),
    (tid, auth_id, uid, 'Stand up JWKS endpoint', 'done', 2000, 'p1', now() - interval '14 days'),
    (tid, auth_id, uid, 'Migrate /login to new verifier', 'done', 3000, 'p0', now() - interval '7 days'),
    (tid, auth_id, uid, 'Session refresh rotation', 'in_progress', 4000, 'p0', now() - interval '3 days'),
    (tid, auth_id, uid, 'Token introspection endpoint', 'in_progress', 5000, 'p1', now() - interval '2 days'),
    (tid, auth_id, uid, 'Decommission legacy auth tables', 'planned', 6000, 'p2', now() - interval '1 days'),
    (tid, auth_id, uid, 'Audit logging for token events', 'review', 7000, 'p1', now() - interval '4 days');

    -- Observability (healthy)
    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, obs_id, uid, 'Ship OpenTelemetry collector', 'done', 1000, 'p2', now() - interval '10 days'),
    (tid, obs_id, uid, 'Dashboards for request latency', 'in_progress', 2000, 'p1', now() - interval '5 days'),
    (tid, obs_id, uid, 'Alerting rules for error rate', 'planned', 3000, 'p2', now() - interval '2 days'),
    (tid, obs_id, uid, 'SLO documentation', 'icebox', 4000, 'p3', now() - interval '1 days');

    -- Checkout Flow (behind — stale cards, few done)
    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, checkout_id, uid, 'Wireframe new flow', 'done', 1000, 'p1', now() - interval '45 days'),
    (tid, checkout_id, uid, 'Payment provider integration', 'in_progress', 2000, 'p0', now() - interval '18 days'),
    (tid, checkout_id, uid, 'Tax calculation edge cases', 'in_progress', 3000, 'p1', now() - interval '12 days'),
    (tid, checkout_id, uid, 'Fraud check hook', 'planned', 4000, 'p1', now() - interval '10 days'),
    (tid, checkout_id, uid, '3DS flow', 'planned', 5000, 'p0', now() - interval '8 days'),
    (tid, checkout_id, uid, 'Receipt emails', 'icebox', 6000, 'p2', now() - interval '15 days');

    -- Mobile App (at risk — high WIP)
    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, mobile_id, uid, 'iOS app shell', 'done', 1000, 'p1', now() - interval '30 days'),
    (tid, mobile_id, uid, 'Android app shell', 'done', 2000, 'p1', now() - interval '25 days'),
    (tid, mobile_id, uid, 'Auth integration', 'in_progress', 3000, 'p0', now() - interval '14 days'),
    (tid, mobile_id, uid, 'Push notifications', 'in_progress', 4000, 'p1', now() - interval '9 days'),
    (tid, mobile_id, uid, 'Offline sync', 'in_progress', 5000, 'p1', now() - interval '11 days'),
    (tid, mobile_id, uid, 'App Store submission', 'planned', 6000, 'p0', now() - interval '5 days'),
    (tid, mobile_id, uid, 'Biometric login', 'icebox', 7000, 'p2', now() - interval '20 days');

    -- Design System (healthy, steady)
    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, ds_id, uid, 'Color token audit', 'done', 1000, 'p2', now() - interval '20 days'),
    (tid, ds_id, uid, 'Button component v2', 'done', 2000, 'p1', now() - interval '14 days'),
    (tid, ds_id, uid, 'Form field components', 'in_progress', 3000, 'p1', now() - interval '5 days'),
    (tid, ds_id, uid, 'Dark mode tokens', 'planned', 4000, 'p2', now() - interval '3 days'),
    (tid, ds_id, uid, 'Documentation site', 'review', 5000, 'p2', now() - interval '4 days');

    -- User Research
    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, research_id, uid, 'Checkout usability study', 'done', 1000, 'p1', now() - interval '18 days'),
    (tid, research_id, uid, 'Mobile onboarding interviews', 'in_progress', 2000, 'p1', now() - interval '6 days'),
    (tid, research_id, uid, 'Post-launch NPS survey', 'planned', 3000, 'p2', now() - interval '2 days');

    -- Goals
    INSERT INTO goals (id, tenant_id, space_id, title, description, status, target_date, created_by) VALUES
    ('cccc0000-0000-0000-0000-000000000001', tid, org_id, 'Ship unified identity platform',
     'Single auth layer across all products by end of Q2', 'active', '2026-06-30', uid),
    ('cccc0000-0000-0000-0000-000000000002', tid, org_id, 'Launch native mobile clients',
     'iOS and Android apps available on stores', 'active', '2026-05-31', uid),
    ('cccc0000-0000-0000-0000-000000000003', tid, platform_id, 'Reduce auth latency 50%',
     'Faster login flow via new token service', 'active', '2026-06-30', uid),
    ('cccc0000-0000-0000-0000-000000000004', tid, product_id, 'Increase checkout conversion 15%',
     'New checkout flow improves abandonment', 'active', '2026-05-31', uid),
    ('cccc0000-0000-0000-0000-000000000005', tid, ux_id, 'Adopt design system across 3 products',
     'Components shipped and in use', 'active', '2026-07-31', uid);

    -- Link a few cards to goals (alignment)
    INSERT INTO goal_links (tenant_id, source_type, source_id, target_goal_id, link_type) VALUES
    (tid, 'card', (SELECT id FROM cards WHERE title = 'Design JWT claims schema' AND tenant_id = tid LIMIT 1),
     'cccc0000-0000-0000-0000-000000000001', 'supports'),
    (tid, 'card', (SELECT id FROM cards WHERE title = 'Migrate /login to new verifier' AND tenant_id = tid LIMIT 1),
     'cccc0000-0000-0000-0000-000000000001', 'drives'),
    (tid, 'card', (SELECT id FROM cards WHERE title = 'Session refresh rotation' AND tenant_id = tid LIMIT 1),
     'cccc0000-0000-0000-0000-000000000003', 'drives'),
    (tid, 'card', (SELECT id FROM cards WHERE title = 'Payment provider integration' AND tenant_id = tid LIMIT 1),
     'cccc0000-0000-0000-0000-000000000004', 'supports'),
    (tid, 'card', (SELECT id FROM cards WHERE title = '3DS flow' AND tenant_id = tid LIMIT 1),
     'cccc0000-0000-0000-0000-000000000004', 'drives'),
    (tid, 'card', (SELECT id FROM cards WHERE title = 'iOS app shell' AND tenant_id = tid LIMIT 1),
     'cccc0000-0000-0000-0000-000000000002', 'supports'),
    (tid, 'card', (SELECT id FROM cards WHERE title = 'Auth integration' AND tenant_id = tid LIMIT 1),
     'cccc0000-0000-0000-0000-000000000002', 'drives'),
    (tid, 'card', (SELECT id FROM cards WHERE title = 'Button component v2' AND tenant_id = tid LIMIT 1),
     'cccc0000-0000-0000-0000-000000000005', 'supports'),
    (tid, 'card', (SELECT id FROM cards WHERE title = 'Form field components' AND tenant_id = tid LIMIT 1),
     'cccc0000-0000-0000-0000-000000000005', 'drives');

END $$;

-- Refresh the materialized view so rollup metrics include the seed data immediately
REFRESH MATERIALIZED VIEW CONCURRENTLY space_rollup_stats;
