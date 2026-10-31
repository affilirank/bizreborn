-- =====================================================================
-- Impressive AI site build seed (separate from teaser preview at /ai-site/[id])
-- Project: uxjfrzjrwilayyeqnrxs (production: www.meritmarketingfl.com)
-- Run in Supabase Dashboard SQL Editor after the migration below.
-- =====================================================================

-- 1) Add the new columns (idempotent)
alter table public.prospects add column if not exists impressive_site_data jsonb default null;
alter table public.prospects add column if not exists impressive_preview_url text default null;

-- 2) Insert / seed the test UUID for impressive-site preview (if not present)
insert into public.prospects (id, business_name, city, phone, google_rating, review_count, status)
values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'Fort Pierce Roofing Pros', 'Fort Pierce', '(772) 555-0199', 4.9, 48, 'lead')
on conflict (id) do nothing;

-- 3) Update the original teaser preview for Coast to Coast Roofing to remain intact
update public.prospects
set generated_site_data = '{
  "hero": {"headline":"Port St. Lucie Trusted Roofing Contractor","subheadline":"Licensed, insured, and rated 4.8 stars by Treasure Coast homeowners. Storm damage, replacements, and repairs done right the first time.","badge":"4.8 Stars · 75 Reviews","cta_text":"Get Your Free Quote"},
  "services":[{"title":"Roof Replacement","blurb":"Shingle, metal, and tile systems installed to Florida hurricane code.","icon":"🏠"},{"title":"Storm & Leak Repair","blurb":"Emergency response for leaks and wind damage across Port St. Lucie.","icon":"🚨"},{"title":"Roof Inspections","blurb":"Insurance and real-estate inspections with photo documentation.","icon":"🔍"},{"title":"Commercial Roofing","blurb":"Flat roof coatings and preventive maintenance for local businesses.","icon":"🏢"}],
  "testimonials":[{"quote":"They replaced our roof after the storm and handled the insurance paperwork. Clean, fast, honest.","name":"Mike R.","stars":5},{"quote":"Best contractor experience we have had in Port St. Lucie. Clear communication from start to finish.","name":"Sarah T.","stars":5}],
  "faq":[{"q":"How quickly can you inspect a roof leak?","a":"We offer same-day and 24-hour emergency assessments throughout the Treasure Coast."},{"q":"Are you licensed and insured in Florida?","a":"Yes — full general liability and workers compensation coverage."}],
  "meta":{"title":"Coast to Coast Roofing — Port St. Lucie, FL","description":"Roofing repair and replacement in Port St. Lucie."}
}'::jsonb
where id = 'c8d12633-7fe7-4dc8-a659-b15384e39457'::uuid and generated_site_data is not null;

-- 4) Verify
select id, business_name, impressive_site_data is not null as has_impressive,
       generated_site_data is not null as has_teaser
from prospects
where id in ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
             'c8d12633-7fe7-4dc8-a659-b15384e39457'::uuid);
