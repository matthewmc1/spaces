#!/usr/bin/env bash
# Seeds Phase 5 demo data into an arbitrary tenant.
# Usage: ./seed_phase5_for_tenant.sh <tenant_id> <owner_user_id>
# Example: ./seed_phase5_for_tenant.sh 295140c3-56cc-460b-97da-283dd8f54e85 5405537b-c3c1-4cfa-bdd4-cc37813ada76
set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <tenant_id> <owner_user_id>"
  exit 1
fi

TID="$1"
UID_="$2"

# Generate stable per-tenant UUIDs by namespacing off the tenant_id's last 12 chars
SUFFIX="${TID: -12}"

docker exec -i spaces-postgres-1 psql -U spaces -d spaces <<SQL
-- Clean existing demo spaces for this tenant (idempotent re-seed)
DELETE FROM goal_links WHERE tenant_id = '${TID}';
DELETE FROM goals WHERE tenant_id = '${TID}';
DELETE FROM cards WHERE tenant_id = '${TID}';
DELETE FROM programme_spaces WHERE tenant_id = '${TID}';
DELETE FROM programmes WHERE tenant_id = '${TID}';
DELETE FROM spaces WHERE tenant_id = '${TID}';

DO \$\$
DECLARE
    tid UUID := '${TID}';
    uid UUID := '${UID_}';
    org_id UUID;
    eng_id UUID;
    design_dept_id UUID;
    platform_id UUID;
    product_id UUID;
    ux_id UUID;
    auth_id UUID;
    obs_id UUID;
    checkout_id UUID;
    mobile_id UUID;
    ds_id UUID;
    research_id UUID;
    prog_identity_id UUID;
    prog_mobile_id UUID;
BEGIN
    org_id := gen_random_uuid();
    eng_id := gen_random_uuid();
    design_dept_id := gen_random_uuid();
    platform_id := gen_random_uuid();
    product_id := gen_random_uuid();
    ux_id := gen_random_uuid();
    auth_id := gen_random_uuid();
    obs_id := gen_random_uuid();
    checkout_id := gen_random_uuid();
    mobile_id := gen_random_uuid();
    ds_id := gen_random_uuid();
    research_id := gen_random_uuid();
    prog_identity_id := gen_random_uuid();
    prog_mobile_id := gen_random_uuid();

    INSERT INTO spaces (id, tenant_id, name, slug, description, path, owner_id, visibility, space_type, status)
    VALUES (org_id, tid, 'Acme Inc', 'acme-' || substr(tid::text, 1, 8), 'Fictional demo organization',
            '/' || org_id || '/', uid, 'public', 'organization', 'on_track');

    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (eng_id, tid, org_id, 'Engineering', 'engineering-' || substr(tid::text, 1, 8), 'Platform and product engineering',
     '/' || org_id || '/' || eng_id || '/', uid, 'public', 'department', 'on_track'),
    (design_dept_id, tid, org_id, 'Design & Research', 'design-' || substr(tid::text, 1, 8), 'Product design and user research',
     '/' || org_id || '/' || design_dept_id || '/', uid, 'public', 'department', 'on_track');

    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (platform_id, tid, eng_id, 'Platform Team', 'platform-' || substr(tid::text, 1, 8), 'Infrastructure and core services',
     '/' || org_id || '/' || eng_id || '/' || platform_id || '/', uid, 'public', 'team', 'on_track'),
    (product_id, tid, eng_id, 'Product Team', 'product-' || substr(tid::text, 1, 8), 'Customer-facing features',
     '/' || org_id || '/' || eng_id || '/' || product_id || '/', uid, 'public', 'team', 'at_risk');

    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (ux_id, tid, design_dept_id, 'UX Team', 'ux-' || substr(tid::text, 1, 8), 'Design systems and research',
     '/' || org_id || '/' || design_dept_id || '/' || ux_id || '/', uid, 'public', 'team', 'on_track');

    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (auth_id, tid, platform_id, 'Auth Rewrite', 'auth-' || substr(tid::text, 1, 8), 'Migrate auth to new identity platform',
     '/' || org_id || '/' || eng_id || '/' || platform_id || '/' || auth_id || '/', uid, 'public', 'workstream', 'on_track'),
    (obs_id, tid, platform_id, 'Observability', 'obs-' || substr(tid::text, 1, 8), 'Metrics, logs, tracing rollout',
     '/' || org_id || '/' || eng_id || '/' || platform_id || '/' || obs_id || '/', uid, 'public', 'workstream', 'on_track');

    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (checkout_id, tid, product_id, 'Checkout Flow', 'checkout-' || substr(tid::text, 1, 8), 'New checkout experience',
     '/' || org_id || '/' || eng_id || '/' || product_id || '/' || checkout_id || '/', uid, 'public', 'workstream', 'behind'),
    (mobile_id, tid, product_id, 'Mobile App', 'mobile-' || substr(tid::text, 1, 8), 'iOS and Android client',
     '/' || org_id || '/' || eng_id || '/' || product_id || '/' || mobile_id || '/', uid, 'public', 'workstream', 'at_risk');

    INSERT INTO spaces (id, tenant_id, parent_space_id, name, slug, description, path, owner_id, visibility, space_type, status) VALUES
    (ds_id, tid, ux_id, 'Design System', 'ds-' || substr(tid::text, 1, 8), 'Component library and tokens',
     '/' || org_id || '/' || design_dept_id || '/' || ux_id || '/' || ds_id || '/', uid, 'public', 'workstream', 'on_track'),
    (research_id, tid, ux_id, 'User Research', 'research-' || substr(tid::text, 1, 8), 'Ongoing user interviews and testing',
     '/' || org_id || '/' || design_dept_id || '/' || ux_id || '/' || research_id || '/', uid, 'public', 'workstream', 'on_track');

    INSERT INTO programmes (id, tenant_id, name, description, status, owner_id, start_date, target_date) VALUES
    (prog_identity_id, tid, 'Identity Platform 2026',
     'Modernize authentication across all products with a unified identity layer.',
     'active', uid, '2026-01-15', '2026-06-30'),
    (prog_mobile_id, tid, 'Mobile Launch Q2',
     'Ship native mobile clients with new checkout flow backed by fresh user research.',
     'active', uid, '2026-02-01', '2026-05-31');

    INSERT INTO programme_spaces (programme_id, space_id, tenant_id, role) VALUES
    (prog_identity_id, auth_id, tid, 'owns'),
    (prog_identity_id, ds_id, tid, 'contributes'),
    (prog_mobile_id, mobile_id, tid, 'owns'),
    (prog_mobile_id, checkout_id, tid, 'contributes'),
    (prog_mobile_id, research_id, tid, 'contributes');

    -- Auth Rewrite cards
    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, auth_id, uid, 'Design JWT claims schema', 'done', 1000, 'p1', now() - interval '21 days'),
    (tid, auth_id, uid, 'Stand up JWKS endpoint', 'done', 2000, 'p1', now() - interval '14 days'),
    (tid, auth_id, uid, 'Migrate /login to new verifier', 'done', 3000, 'p0', now() - interval '7 days'),
    (tid, auth_id, uid, 'Session refresh rotation', 'in_progress', 4000, 'p0', now() - interval '3 days'),
    (tid, auth_id, uid, 'Token introspection endpoint', 'in_progress', 5000, 'p1', now() - interval '2 days'),
    (tid, auth_id, uid, 'Decommission legacy auth tables', 'planned', 6000, 'p2', now() - interval '1 days'),
    (tid, auth_id, uid, 'Audit logging for token events', 'review', 7000, 'p1', now() - interval '4 days');

    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, obs_id, uid, 'Ship OpenTelemetry collector', 'done', 1000, 'p2', now() - interval '10 days'),
    (tid, obs_id, uid, 'Dashboards for request latency', 'in_progress', 2000, 'p1', now() - interval '5 days'),
    (tid, obs_id, uid, 'Alerting rules for error rate', 'planned', 3000, 'p2', now() - interval '2 days'),
    (tid, obs_id, uid, 'SLO documentation', 'icebox', 4000, 'p3', now() - interval '1 days');

    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, checkout_id, uid, 'Wireframe new flow', 'done', 1000, 'p1', now() - interval '45 days'),
    (tid, checkout_id, uid, 'Payment provider integration', 'in_progress', 2000, 'p0', now() - interval '18 days'),
    (tid, checkout_id, uid, 'Tax calculation edge cases', 'in_progress', 3000, 'p1', now() - interval '12 days'),
    (tid, checkout_id, uid, 'Fraud check hook', 'planned', 4000, 'p1', now() - interval '10 days'),
    (tid, checkout_id, uid, '3DS flow', 'planned', 5000, 'p0', now() - interval '8 days'),
    (tid, checkout_id, uid, 'Receipt emails', 'icebox', 6000, 'p2', now() - interval '15 days');

    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, mobile_id, uid, 'iOS app shell', 'done', 1000, 'p1', now() - interval '30 days'),
    (tid, mobile_id, uid, 'Android app shell', 'done', 2000, 'p1', now() - interval '25 days'),
    (tid, mobile_id, uid, 'Auth integration', 'in_progress', 3000, 'p0', now() - interval '14 days'),
    (tid, mobile_id, uid, 'Push notifications', 'in_progress', 4000, 'p1', now() - interval '9 days'),
    (tid, mobile_id, uid, 'Offline sync', 'in_progress', 5000, 'p1', now() - interval '11 days'),
    (tid, mobile_id, uid, 'App Store submission', 'planned', 6000, 'p0', now() - interval '5 days'),
    (tid, mobile_id, uid, 'Biometric login', 'icebox', 7000, 'p2', now() - interval '20 days');

    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, ds_id, uid, 'Color token audit', 'done', 1000, 'p2', now() - interval '20 days'),
    (tid, ds_id, uid, 'Button component v2', 'done', 2000, 'p1', now() - interval '14 days'),
    (tid, ds_id, uid, 'Form field components', 'in_progress', 3000, 'p1', now() - interval '5 days'),
    (tid, ds_id, uid, 'Dark mode tokens', 'planned', 4000, 'p2', now() - interval '3 days'),
    (tid, ds_id, uid, 'Documentation site', 'review', 5000, 'p2', now() - interval '4 days');

    INSERT INTO cards (tenant_id, space_id, created_by, title, column_name, position, priority, moved_at) VALUES
    (tid, research_id, uid, 'Checkout usability study', 'done', 1000, 'p1', now() - interval '18 days'),
    (tid, research_id, uid, 'Mobile onboarding interviews', 'in_progress', 2000, 'p1', now() - interval '6 days'),
    (tid, research_id, uid, 'Post-launch NPS survey', 'planned', 3000, 'p2', now() - interval '2 days');

    INSERT INTO goals (tenant_id, space_id, title, description, status, target_date, created_by) VALUES
    (tid, org_id, 'Ship unified identity platform',
     'Single auth layer across all products by end of Q2', 'active', '2026-06-30', uid),
    (tid, org_id, 'Launch native mobile clients',
     'iOS and Android apps available on stores', 'active', '2026-05-31', uid),
    (tid, platform_id, 'Reduce auth latency 50%',
     'Faster login flow via new token service', 'active', '2026-06-30', uid),
    (tid, product_id, 'Increase checkout conversion 15%',
     'New checkout flow improves abandonment', 'active', '2026-05-31', uid),
    (tid, ux_id, 'Adopt design system across 3 products',
     'Components shipped and in use', 'active', '2026-07-31', uid);

END \$\$;

REFRESH MATERIALIZED VIEW CONCURRENTLY space_rollup_stats;

SELECT 'Seeded tenant ${TID}:' as status;
SELECT COUNT(*) as spaces FROM spaces WHERE tenant_id = '${TID}';
SELECT COUNT(*) as cards FROM cards WHERE tenant_id = '${TID}';
SELECT COUNT(*) as programmes FROM programmes WHERE tenant_id = '${TID}';
SELECT COUNT(*) as goals FROM goals WHERE tenant_id = '${TID}';
SQL
