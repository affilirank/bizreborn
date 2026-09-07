-- ============================================================
-- Biz Reborn Marketing — schema
-- PostgreSQL + Supabase: enums, tables, triggers, RLS
-- Run the whole file in the Supabase SQL editor (or supabase db push).
-- Mirrors the proven layout of the blessed-barbershop project.
-- NOTE: run on a fresh database (or drop existing biz-reborn
-- objects first) — tables/types are created with plain DDL.
-- ============================================================

begin;

-- ---------- Enums ----------
create type public.user_role as enum ('client', 'admin');
create type public.order_status as enum ('active', 'cancelled', 'paused');
create type public.task_status as enum ('queued', 'in_progress', 'review', 'completed');
create type public.task_priority as enum ('high', 'medium', 'low');
create type public.asset_kind as enum ('image', 'video', 'doc');
create type public.lead_source as enum ('audit', 'contact', 'chat');

-- ---------- Profiles (extends Supabase auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  business_name text,
  phone text,
  role public.user_role not null default 'client',
  created_at timestamptz not null default now()
);

-- ---------- Audits ----------
create table public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  url text not null,
  business_name text,
  gbp text,
  instagram text,
  facebook text,
  tiktok text,
  health_score integer not null,
  grade text not null,
  breakdowns jsonb not null default '[]'::jsonb,
  pain_points jsonb not null default '[]'::jsonb,
  fixes jsonb not null default '[]'::jsonb,
  compared_to jsonb not null default '[]'::jsonb,
  keyword_searches jsonb not null default '[]'::jsonb,
  contact jsonb,
  form_data jsonb,
  created_at timestamptz not null default now()
);

create index audits_user_idx on public.audits (user_id);
create index audits_created_idx on public.audits (created_at desc);

-- ---------- Orders / Service Menus ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  stripe_session_id text,
  business_name text not null,
  email text not null,
  phone text,
  vertical text not null,
  service_ids integer[] not null default '{}'::integer[],
  one_time_total integer not null default 0,
  monthly_total integer not null default 0,
  tier text,
  status public.order_status not null default 'active',
  projection jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);

-- ---------- Fulfillment Tasks ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  service_id integer not null,
  service_title text not null,
  client_name text,
  assignee text,
  status public.task_status not null default 'queued',
  progress integer not null default 0 check (progress between 0 and 100),
  priority public.task_priority not null default 'medium',
  due_date date,
  created_at timestamptz not null default now()
);

-- ---------- Assets ----------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  order_id uuid references public.orders (id) on delete set null,
  name text not null,
  kind public.asset_kind not null,
  size_bytes bigint,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

-- ---------- Leads ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  phone text,
  email text not null,
  source public.lead_source not null default 'contact',
  message text,
  vertical text,
  created_at timestamptz not null default now()
);

create index leads_created_idx on public.leads (created_at desc);

-- ---------- Subscription sync ----------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  tier text,
  amount integer not null default 0,
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Functions & triggers
-- ============================================================

-- Auto-create a profile row when a new auth user signs up.
-- Role is read from raw_user_meta_data (set at signup time), so an
-- admin account can be provisioned by including "role":"admin".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, business_name, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'client')::public.user_role,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.audits enable row level security;
alter table public.orders enable row level security;
alter table public.tasks enable row level security;
alter table public.assets enable row level security;
alter table public.leads enable row level security;
alter table public.subscriptions enable row level security;

-- Profiles: users manage their own row.
create policy "profiles select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id);

-- Audits: anyone may run one; owners read theirs, admins read all.
create policy "audits insert anyone"
  on public.audits for insert
  with check (true);

create policy "audits read own or admin"
  on public.audits for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Orders: clients read and (at checkout) create their own; only admins can
-- modify or delete existing rows. Stripe-webhook writes use the service role,
-- which bypasses RLS entirely.
create policy "orders read own or admin"
  on public.orders for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "orders insert own"
  on public.orders for insert
  with check (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "orders update admin"
  on public.orders for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "orders delete admin"
  on public.orders for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Tasks: owners view their order's tasks, admins manage all.
create policy "tasks read own order or admin"
  on public.tasks for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "tasks insert own order or admin"
  on public.tasks for insert
  with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "tasks update admin"
  on public.tasks for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Assets: owners manage their own, admins read all.
create policy "assets manage own"
  on public.assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "assets read admin"
  on public.assets for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Leads: anyone may submit; only admins can view.
create policy "leads insert anyone"
  on public.leads for insert
  with check (true);

create policy "leads read admin"
  on public.leads for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Subscriptions: owners read theirs, admins manage all.
create policy "subscriptions read own or admin"
  on public.subscriptions for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "subscriptions manage admin"
  on public.subscriptions for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

create policy "clients upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "anyone can read assets"
  on storage.objects for select
  using (bucket_id = 'assets');

-- ============================================================
-- Blog (admin-managed content)
-- ============================================================
create type public.blog_status as enum ('draft', 'published');

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  meta_title text,
  meta_description text,
  keywords text[] not null default '{}',
  intro text,
  sections jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  cta_headline text,
  cta_body text,
  read_time int not null default 5,
  pillar text,
  pillar_number int,
  service_id int,
  service_title text,
  status public.blog_status not null default 'draft',
  published timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blog_posts_status_published_idx
  on public.blog_posts (status, published desc);
create index blog_posts_slug_idx
  on public.blog_posts (slug);

-- Keep updated_at fresh on every write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_blog_posts_updated
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

-- Anyone can read published posts (the public blog).
create policy "blog read published"
  on public.blog_posts for select
  using (status = 'published');

-- Admins manage all posts, including drafts.
create policy "blog manage admin"
  on public.blog_posts for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- Offers (custom-priced proposals with Stripe payment links)
-- ============================================================
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default gen_random_uuid()::text,
  client_name text not null,
  client_email text,
  services integer[] not null default '{}'::integer[],
  service_titles text[] not null default '{}'::text[],
  list_price integer not null default 0,
  offer_price integer not null default 0,
  discount_pct integer not null default 0,
  status text not null default 'draft',
  stripe_payment_link text,
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index offers_created_idx on public.offers (created_at desc);

-- ============================================================
-- Monthly reports (manager-written, delivered via shareable links)
-- ============================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default gen_random_uuid()::text,
  client_name text not null,
  client_email text,
  month text,
  headline text,
  highlights text[] not null default '{}'::text[],
  metrics jsonb not null default '[]'::jsonb,
  deliverables text[] not null default '{}'::text[],
  next_steps text[] not null default '{}'::text[],
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_created_idx on public.reports (created_at desc);

create trigger trg_reports_updated
  before update on public.reports
  for each row execute function public.set_updated_at();

-- Task time logging columns
alter table public.tasks add column if not exists estimated_hours numeric(4,1) not null default 0;
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists offer_id uuid references public.offers (id) on delete set null;

-- ============================================================
-- Work logs (day + hours captured when a task is checked off)
-- ============================================================
create table public.work_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks (id) on delete cascade,
  client_name text not null,
  service text not null,
  work_date date not null default current_date,
  hours numeric(4,1) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index work_logs_created_idx on public.work_logs (created_at desc);

-- ---------- RLS ----------
alter table public.offers enable row level security;
alter table public.reports enable row level security;
alter table public.work_logs enable row level security;

-- Offers: admin manages all; clients reach theirs via the public token page
-- (service role), never via the API.
create policy "offers read admin"
  on public.offers for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "offers insert admin"
  on public.offers for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "offers update admin"
  on public.offers for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "offers delete admin"
  on public.offers for delete
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Reports: the owning client (matched by email) reads their own; admins manage all.
create policy "reports read own or admin"
  on public.reports for select
  to authenticated
  using (
    auth.jwt() ->> 'email' = client_email
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "reports insert admin"
  on public.reports for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "reports update admin"
  on public.reports for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "reports delete admin"
  on public.reports for delete
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Work logs: admins only.
create policy "work logs manage admin"
  on public.work_logs for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Lead generation module (prospects, pitch videos, proposal video):
-- see supabase/leadgen.sql (idempotent, safe on an existing database).
commit;
