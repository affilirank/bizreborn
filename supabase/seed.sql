-- ============================================================
-- Biz Reborn Marketing — seed data
-- Run AFTER schema.sql in the Supabase SQL editor.
-- Demo logins (password set below):
--   admin@bizreborn.io  /  admin1234   (role: admin)
--   client@bizreborn.io /  demo1234    (role: client)
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Demo auth users (profiles are created by handle_new_user) ----------
-- Mirrors exactly what GoTrue writes on signup: zero-UUID instance_id,
-- aud/role = 'authenticated', app metadata with the email provider, and a
-- cost-10 bcrypt hash (GoTrue rejects lower-cost hashes).
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@bizreborn.io', crypt('admin1234', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Biz Reborn Admin","role":"admin","business_name":"Biz Reborn"}'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client@bizreborn.io', crypt('demo1234', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Marcus Webb","role":"client","business_name":"Twin Peaks Barbershop","phone":"(512) 555-0142"}')
on conflict (id) do nothing;

-- Modern GoTrue resolves users through auth.identities; every email/password
-- account needs an identity row or logins can't find it.
insert into auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '{"sub":"00000000-0000-4000-8000-000000000001","email":"admin@bizreborn.io","email_verified":false,"phone_verified":false}'::jsonb, 'email', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '{"sub":"00000000-0000-4000-8000-000000000002","email":"client@bizreborn.io","email_verified":false,"phone_verified":false}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;

-- ---------- Demo order for the client ----------
insert into public.orders (
  id, user_id, business_name, email, phone, vertical, service_ids,
  one_time_total, monthly_total, tier, status, projection, stripe_session_id
) values (
  '11111111-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Twin Peaks Barbershop',
  'client@bizreborn.io',
  '(512) 555-0142',
  'barbershop',
  array[1, 31, 41, 11, 21],
  3580, 1050, 'growth', 'active',
  '{"leadIncreasePct":60,"leadsPerMonth":35,"acv":45,"projectedMonthly":551,"roas":5}'::jsonb,
  'cs_test_seeded'
) on conflict (id) do nothing;

-- ---------- Demo fulfillment tasks ----------
insert into public.tasks (id, order_id, service_id, service_title, assignee, status, progress, priority, due_date) values
  ('33333333-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 1,  'Google Business Profile Optimization & Audit', 'Marcus', 'in_progress', 48, 'high',  current_date + 3),
  ('33333333-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', 31, 'Automated Post-Service SMS Review Request Campaigns', 'Dana', 'queued', 12, 'high', current_date + 4),
  ('33333333-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001', 41, 'Instant ''Missed-Call Text-Back'' Automation Setup', null, 'queued', 0, 'medium', current_date + 5),
  ('33333333-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001', 11, 'Monthly Short-Form Video Batch Strategy (15 Reels/TikToks)', 'Vince', 'review', 74, 'high', current_date + 7),
  ('33333333-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000001', 21, 'High-Converting Custom Next.js Landing Page Build', null, 'completed', 100, 'low', current_date - 1)
on conflict (id) do nothing;

-- ---------- Demo audit for the client ----------
insert into public.audits (
  id, user_id, url, business_name, gbp, instagram, facebook, tiktok,
  health_score, grade, breakdowns, pain_points, fixes, compared_to, keyword_searches
) values (
  '22222222-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'https://twinapex.com',
  'Twin Peaks Barbershop',
  'Twin Peaks Barbershop',
  '@twinapexcuts',
  'facebook.com/twinapex',
  '@twinapexcuts',
  38, 'D',
  '[
    {"key":"localSeo","label":"Local SEO","score":34,"description":"Map pack visibility is weak — NAP is inconsistent across directories.","issues":["Citations inconsistent on 12 directories"]},
    {"key":"socialVelocity","label":"Social Velocity","score":28,"description":"Posting is sporadic, so your audience and algorithm trust stay low.","issues":["No short-form video in the last 3 weeks"]},
    {"key":"conversion","label":"Conversion","score":45,"description":"Your booking path has friction; calls go to voicemail after hours.","issues":["No missed-call text-back automation"]},
    {"key":"reputation","label":"Reputation","score":47,"description":"Review velocity is a trickle — most happy clients never leave one.","issues":["No automated review request flow"]}
  ]'::jsonb,
  '["You have only 11 Google reviews and add 1-2 per month, so competitors with 50+ show up first.","Your last post was over 3 weeks ago — the algorithm is throttling your reach.","Calls that come in after 7pm go straight to voicemail and are never followed up.","Your Google Business Profile is missing services, photos, and Q&A entries."]'::jsonb,
  '["Run Google Business Profile Optimization & Audit (service #1) to rebuild the listing.","Set up Automated Post-Service SMS Review Request Campaigns (service #31) to fix review velocity.","Add Instant Missed-Call Text-Back Automation (service #41) to capture after-hours leads.","Start a Monthly Short-Form Video Batch (service #11) to restart organic reach."]'::jsonb,
  '[{"label":"Ace Cuts & Fades","count":127},{"label":"Iron Peak Barbers","count":89},{"label":"Lone Star Clippers","count":63}]'::jsonb,
  '[
    {"term":"barbershop near me","volume":18100,"difficulty":72},
    {"term":"best fade barber austin","volume":6600,"difficulty":58},
    {"term":"barbershop open late","volume":4400,"difficulty":49},
    {"term":"hot towel shave near me","volume":2400,"difficulty":41}
  ]'::jsonb
) on conflict (id) do nothing;

-- ---------- Demo leads ----------
insert into public.leads (id, name, business_name, phone, email, source, message, vertical) values
  ('44444444-0000-4000-8000-000000000001', 'Dana Ortiz', 'Ortiz Dental Studio', '(512) 555-0187', 'dana@ortizdental.com', 'audit', null, 'professional'),
  ('44444444-0000-4000-8000-000000000002', 'Priya Raman', 'Raman Realty Partners', '(512) 555-0103', 'priya@ramanrealty.com', 'contact', 'Need reviews and short-form content for our listings.', 'realestate'),
  ('44444444-0000-4000-8000-000000000003', 'Jorge Alvarez', 'Alvarez Heating & Cooling', '(512) 555-0136', 'jorge@alvarezac.com', 'audit', null, 'contractor')
on conflict (id) do nothing;
