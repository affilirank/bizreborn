-- =====================================================================
-- Migration: AI site preview + voice receptionist columns
-- Project: uxjfrzjrwilayyeqnrxs (production: www.meritmarketingfl.com)
-- Safe / idempotent. Run in Supabase Dashboard -> SQL Editor.
-- =====================================================================

-- 1) Columns the /ai-site/[id] route reads.
--    NOTE: production already uses `google_rating` and `review_count`
--    (not `rating` / `reviews_count`), so no change is needed there.
alter table public.prospects add column if not exists generated_site_data jsonb default null;
alter table public.prospects add column if not exists site_preview_url text default null;
alter table public.prospects add column if not exists receptionist_audio_url text default null;
alter table public.prospects add column if not exists reception_script text default null;

-- 2) Seed a REAL existing production lead so we can verify end-to-end today.
--    Coast to Coast Roofing — Port St. Lucie, 4.8 stars, 75 reviews.
update public.prospects
set generated_site_data = '{
  "hero": {
    "headline": "Port St. Lucie''s Trusted Roofing Contractor",
    "subheadline": "Licensed, insured, and rated 4.8 stars by Treasure Coast homeowners. Storm damage, replacements, and repairs done right the first time.",
    "badge": "4.8 Stars · 75 Reviews",
    "cta_text": "Get Your Free Quote"
  },
  "services": [
    {"title": "Roof Replacement", "blurb": "Shingle, metal, and tile systems installed to Florida hurricane code.", "icon": "🏠"},
    {"title": "Storm & Leak Repair", "blurb": "Emergency response for leaks and wind damage across Port St. Lucie.", "icon": "🚨"},
    {"title": "Roof Inspections", "blurb": "Insurance and real-estate inspections with photo documentation.", "icon": "🔍"},
    {"title": "Commercial Roofing", "blurb": "Flat roof coatings and preventive maintenance for local businesses.", "icon": "🏢"}
  ],
  "testimonials": [
    {"quote": "They replaced our roof after the storm and handled the insurance paperwork. Clean, fast, honest.", "name": "Mike R.", "stars": 5},
    {"quote": "Best contractor experience we have had in Port St. Lucie. Clear communication from start to finish.", "name": "Sarah T.", "stars": 5}
  ],
  "faq": [
    {"q": "How quickly can you inspect a roof leak?", "a": "We offer same-day and 24-hour emergency assessments throughout the Treasure Coast."},
    {"q": "Are you licensed and insured in Florida?", "a": "Yes - full general liability and workers compensation coverage."}
  ],
  "meta": {"title": "Coast to Coast Roofing - Port St. Lucie, FL", "description": "Roofing repair and replacement in Port St. Lucie."},
  "raw_review_highlights": []
}'::jsonb
where id = 'c8d12633-7fe7-4dc8-a659-b15384e39457'::uuid;

-- 3) Optional: the original test UUID (insert with PRODUCTION column names).
insert into public.prospects (id, business_name, city, phone, google_rating, review_count, status)
values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
        'Fort Pierce Roofing Pros', 'Fort Pierce', '(772) 555-0199', 4.9, 48, 'lead')
on conflict (id) do update
  set business_name = excluded.business_name,
      city = excluded.city,
      google_rating = excluded.google_rating,
      review_count = excluded.review_count;

update public.prospects
set generated_site_data = '{
  "hero": {
    "headline": "Premier Roofing Services in Fort Pierce, FL",
    "subheadline": "Licensed, insured, and trusted by homeowners across the Treasure Coast. Fast emergency repairs and full roof replacements.",
    "badge": "Top Rated in Fort Pierce",
    "cta_text": "Get Your Free Quote"
  },
  "services": [
    {"title": "Emergency Leak Repair", "blurb": "Rapid response to storm damage and sudden roof leaks.", "icon": "🚨"},
    {"title": "Full Roof Replacement", "blurb": "Shingle, metal, and tile roofing installed to Florida hurricane code.", "icon": "🏠"},
    {"title": "Roof Inspections", "blurb": "Comprehensive insurance inspections and storm damage assessments.", "icon": "🔍"},
    {"title": "Commercial Roofing", "blurb": "Flat roof coatings and maintenance for local businesses.", "icon": "🏢"}
  ],
  "testimonials": [
    {"quote": "They fixed our leak within 24 hours after the storm. Outstanding service and honest pricing.", "name": "Mike R.", "stars": 5},
    {"quote": "Best contractor experience we have had in Fort Pierce. Clear communication from start to finish.", "name": "Sarah T.", "stars": 5}
  ],
  "faq": [
    {"q": "How quickly can you inspect a roof leak?", "a": "We offer same-day and 24-hour emergency assessments throughout Fort Pierce."},
    {"q": "Are you licensed and insured in Florida?", "a": "Yes - full general liability and workers compensation coverage."}
  ],
  "meta": {"title": "Fort Pierce Roofing Pros", "description": "Roofing services in Fort Pierce, FL."},
  "raw_review_highlights": []
}'::jsonb
where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;

-- 4) Verify
select id, business_name, city, google_rating, review_count,
       generated_site_data is not null as has_site,
       receptionist_audio_url is not null as has_audio
from public.prospects
where id in ('c8d12633-7fe7-4dc8-a659-b15384e39457',
             'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
