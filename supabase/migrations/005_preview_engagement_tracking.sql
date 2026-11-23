-- =====================================================================
-- Migration: Preview engagement tracking (high-intent events)
-- Project: uxjfrzjrwilayyeqnrxs (production: www.meritmarketingfl.com)
-- Idempotent. Run in Supabase Dashboard -> SQL Editor.
--
-- Columns written by POST /api/preview/engage when a visitor plays the AI
-- receptionist audio or sends a message in the preview chat widget.
-- =====================================================================

alter table public.prospects add column if not exists email_opened timestamptz;
alter table public.prospects add column if not exists site_preview_clicked timestamptz;
alter table public.prospects add column if not exists audio_played timestamptz;
alter table public.prospects add column if not exists chat_interaction timestamptz;

create index if not exists idx_prospects_tracking_events
  on public.prospects (email_opened, site_preview_clicked, audio_played, chat_interaction);
