/**
 * Idempotent migration for the lead-generation module. Safe to re-run.
 * Kept in TS so the admin UI can surface it when the table is missing.
 * A copy lives at supabase/leadgen.sql for repo readers.
 */
export const LEADGEN_SQL = `-- Biz Reborn · lead-generation module (prospects + pitch videos + proposals)
-- Idempotent: safe to run more than once in the Supabase SQL editor.

create table if not exists public.prospects (
  qualifying_score integer,
  missing_gbp_apple boolean,
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  city text,
  website text,
  email text,
  phone text,
  instagram text,
  facebook text,
  tiktok text,
  google_rating numeric,
  review_count integer,
  unanswered_reviews integer,
  competitor_name text,
  competitor_reviews integer,
  audit_report jsonb,
  roi_projection jsonb,
  recommended_services integer[],
  audit_screenshot_url text,
  website_preview_url text,
  voiceover_url text,
  video_url text,
  thumbnail_url text,
  pitch_script text,
  slug text unique,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns added after the first release (no-ops when already present).
alter table public.prospects add column if not exists instagram text;
alter table public.prospects add column if not exists facebook text;
alter table public.prospects add column if not exists tiktok text;
alter table public.prospects add column if not exists audit_report jsonb;
alter table public.prospects add column if not exists roi_projection jsonb;
alter table public.prospects add column if not exists recommended_services integer[];
alter table public.prospects add column if not exists google_maps_link text;
alter table public.prospects add column if not exists qualifying_score integer;
alter table public.prospects add column if not exists missing_gbp_apple boolean;

create index if not exists prospects_status_idx on public.prospects (status);
create index if not exists prospects_slug_idx on public.prospects (slug);
create index if not exists prospects_created_idx on public.prospects (created_at desc);

alter table public.prospects enable row level security;

drop policy if exists "prospects read admin" on public.prospects;
create policy "prospects read admin"
  on public.prospects for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "prospects manage admin" on public.prospects;
create policy "prospects manage admin"
  on public.prospects for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "prospects read public when ready" on public.prospects;
create policy "prospects read public when ready"
  on public.prospects for select
  to anon, authenticated
  using (status = 'ready');

-- Proposals can embed the pitch video / link back to the prospect.
alter table public.offers add column if not exists video_url text;
alter table public.offers add column if not exists prospect_id uuid;

-- Recurring retainer proposals: billing mode, term options (6/12/24 mo) and
-- per-term discounted monthly rates the manager sets against the list price.
alter table public.offers add column if not exists billing_mode text not null default 'one-time';
alter table public.offers add column if not exists term_months integer;
alter table public.offers add column if not exists monthly_list_price integer not null default 0;
alter table public.offers add column if not exists monthly_term_prices jsonb not null default '{}'::jsonb;

-- Media bucket (only needed for real MP4/voiceover renders).
insert into storage.buckets (id, name, public) values ('leadgen', 'leadgen', true)
  on conflict (id) do nothing;

drop policy if exists "leadgen public read" on storage.objects;
create policy "leadgen public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'leadgen');

drop policy if exists "leadgen write admin" on storage.objects;
create policy "leadgen write admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'leadgen' and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Strategy/discovery call bookings (public scheduling + admin management).
-- Public inserts happen through the API's service-role client; the table stays
-- admin-read/manage-only under RLS so prospect names/emails are never exposed.
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  business_name text,
  notes text,
  call_type text not null default 'Strategy Call',
  scheduled_at timestamptz not null,
  duration_min integer not null default 60,
  timezone text,
  status text not null default 'confirmed',
  prospect_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_duration_positive check (duration_min > 0)
);

create index if not exists bookings_scheduled_idx on public.bookings (scheduled_at);
create index if not exists bookings_status_idx on public.bookings (status, scheduled_at);
create index if not exists bookings_email_idx on public.bookings (email);

alter table public.bookings enable row level security;

drop policy if exists "bookings admin all" on public.bookings;
create policy "bookings admin all"
  on public.bookings for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
`;
