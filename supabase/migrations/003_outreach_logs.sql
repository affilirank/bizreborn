-- Biz Reborn · multi-channel video messaging queue
-- Tracks every outbound video pitch across Instagram, Messenger, WhatsApp,
-- and TikTok, plus inbound replies and delivery/read receipts.
--
-- Idempotent: safe to run more than once in the Supabase SQL editor.

create table if not exists public.outreach_logs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete set null,
  channel text not null check (channel in ('instagram', 'facebook', 'whatsapp', 'tiktok')),
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  delivery_mode text not null default 'api' check (delivery_mode in ('api', 'manual')),
  recipient text not null,
  recipient_name text,
  page_id text,
  message text,
  video_url text,
  thumbnail_url text,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'delivered', 'read', 'replied', 'failed', 'cancelled')),
  attempt integer not null default 0,
  max_attempts integer not null default 3,
  provider_message_id text,
  error_code text,
  error_message text,
  next_attempt_at timestamptz,
  payload jsonb,
  response jsonb,
  ghl_synced_at timestamptz,
  ghl_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns added after the first release (no-ops when already present).
alter table public.outreach_logs add column if not exists direction text not null default 'outbound';
alter table public.outreach_logs add column if not exists delivery_mode text not null default 'api';
alter table public.outreach_logs add column if not exists thumbnail_url text;
alter table public.outreach_logs add column if not exists response jsonb;
alter table public.outreach_logs add column if not exists ghl_synced_at timestamptz;
alter table public.outreach_logs add column if not exists ghl_error text;
alter table public.outreach_logs add column if not exists next_attempt_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'outreach_logs_delivery_mode_check'
  ) then
    alter table public.outreach_logs
      add constraint outreach_logs_delivery_mode_check
      check (delivery_mode in ('api', 'manual'));
  end if;
end $$;

create index if not exists outreach_logs_prospect_idx
  on public.outreach_logs (prospect_id, created_at desc);
create index if not exists outreach_logs_status_idx
  on public.outreach_logs (status, next_attempt_at);
create index if not exists outreach_logs_channel_idx
  on public.outreach_logs (channel, created_at desc);
create index if not exists outreach_logs_delivery_mode_idx
  on public.outreach_logs (delivery_mode, status, created_at desc);
create index if not exists outreach_logs_created_idx
  on public.outreach_logs (created_at desc);

-- Webhook receipts are idempotent: one row per provider message id per channel.
create unique index if not exists outreach_logs_provider_message_idx
  on public.outreach_logs (channel, provider_message_id)
  where provider_message_id is not null;

alter table public.outreach_logs enable row level security;

drop policy if exists "outreach logs read admin" on public.outreach_logs;
create policy "outreach logs read admin"
  on public.outreach_logs for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "outreach logs manage admin" on public.outreach_logs;
create policy "outreach logs manage admin"
  on public.outreach_logs for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
