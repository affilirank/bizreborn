-- =====================================================================
-- Migration: GHL v2 bridge contact id
-- Project: uxjfrzjrwilayyeqnrxs (production: www.meritmarketingfl.com)
-- Adds `ghl_contact_id` to track which GoHighLevel contact each high-intent event syncs.
-- Run in Supabase Dashboard -> SQL Editor. Idempotent; safe to run more than once.
-- =====================================================================

alter table public.prospects add column if not exists ghl_contact_id text;

create index if not exists prospects_ghl_contact_idx on public.prospects (ghl_contact_id);
