# Biz Reborn Marketing

A state-of-the-art, high-converting, full-stack web application for **Biz Reborn
Marketing** — a hybrid AI-powered agency platform, SaaS brand audit engine, and
modular e-commerce service portal.

Built with **Next.js (App Router)**, **Tailwind CSS**, **TypeScript**,
**Supabase** (Database & Auth), **Stripe**, **Framer Motion**, and **Recharts**.

---

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

The app runs fully in **demo mode** out of the box — no keys required. The
entire funnel works end-to-end:

1. Run the **free AI Brand Audit** → get a Brand Health Score out of 100.
2. The audit's recommended fixes **pre-load into the service builder**.
3. Build a menu from **100 modular services across 10 pillars**.
4. Watch the **live ROI calculator** project revenue impact.
5. Complete **checkout** (simulated Stripe in demo mode) → track
   **fulfillment in the client dashboard**.
6. Ask the **AI chat assistant** (bottom-right) anything about the 100+ modules,
   10 pillars, pricing, or the audit — it's trained on the knowledge base.
7. Send a message via **/contact** (email required) → lead lands in the admin
   portal and in the **MailerLite autoresponder** when configured.

---

## Demo credentials / paths

| Path | What it is |
| --- | --- |
| `/` | Homepage — VSL, pain-point agitation, real-time stats |
| `/audit` | Engine A — AI Brand Audit (lead-gated) |
| `/services` | Engine B — 100-module menu builder + ROI + checkout |
| `/contact` | Contact form — email required, leads captured |
| `/login` / `/signup` | Auth (Supabase or demo) |
| `/dashboard` | Client Command Center |
| `/admin` | Biz Reborn Admin Command Center (incl. captured leads) |
| `/api/audit` | Server-side audit execution |
| `/api/checkout` | Stripe Checkout Session creation |
| `/api/webhook` | Stripe webhook receiver |
| `/api/leads` | Lead capture → MailerLite subscribe (autoresponder) |
| `/api/chat` | AI assistant — KB engine or OpenAI-backed RAG |

In demo mode, click **"Enter demo dashboard"** on the login page (or just visit
`/admin`) — the portals auto-seed realistic demo data.

---

## Going live (Supabase + Stripe + MailerLite)

1. Copy `.env.example` to `.env.local` and fill in the values.
2. **Supabase:** in the SQL editor, run `supabase/schema.sql` first, then
   `supabase/seed.sql`. Run these on a fresh database (or drop the existing
   biz-reborn tables/types first) — schema defines enums, tables, the
   auto-profile `handle_new_user` trigger, RLS, and the storage bucket; seed
   creates two demo accounts:
   - `admin@bizreborn.io` / `admin1234` — admin role
   - `client@bizreborn.io` / `demo1234` — client role
   Set `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API) so the Stripe
   webhook can write orders behind RLS.
3. **Stripe:** set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
   Run `stripe listen --forward-to localhost:3000/api/webhook` and paste the
   secret into `STRIPE_WEBHOOK_SECRET`.
4. **MailerLite (auto-responder):** create a new API token in MailerLite under
   *Integrations → Developers*, paste it into `MAILERLITE_API_KEY`, and set
   `MAILERLITE_GROUP_ID` to the group that owns your welcome/auto-responder
   sequence. Subscribers added to that group automatically start the sequence —
   the audit gate and contact form both feed it. Leave the group id empty to
   just collect leads without sending.
5. Restart the dev server. The demo banner disappears and the app switches to
   live auth + payments + email automatically.

### VSL video
A 76-second motion-graphics VSL ships at `public/vsl.mp4` (rendered procedurally
via ffmpeg + Pillow, see `docs/vsl-script.md` for the shot-by-shot script usable
in third-party video generators). Timed captions are burned into the frames; a
standalone subtitle file is available at `public/vsl.srt`. Set
`NEXT_PUBLIC_VSL_SRC` to point the player at your own video. Without it,
the player renders an animated cinematic preview with the same 76-second script.

---

## Architecture

```
src/
  app/                 # App Router pages + API routes
    api/audit/         # server-side audit (zod-validated)
    api/checkout/      # Stripe Checkout session / demo totals
    api/webhook/       # Stripe webhook → fulfillment/billing
    api/leads/         # lead capture → MailerLite autoresponder
    api/chat/          # AI assistant (KB engine / OpenAI RAG)
    audit/ services/   # Engine A & B pages
    dashboard/ admin/  # Client & Admin portals
    contact/ login/ signup/  # Contact + Auth
  components/
    ui/                # Button, Card, Gauge, Badge, Accordion, AnimatedNumber…
    home/              # Hero (VSL), pain points, stats, engines, pillars, CTA
    audit/             # Audit widget: lead gate → scan → report
    builder/           # Cart store, menu, ROI calculator, checkout
    chat/              # Floating AI assistant widget
    contact/           # Contact form (email required)
    dashboard/         # KPIs, charts, asset vault, admin boards
  data/services.ts     # 100+ services, 10 pillars, 6 verticals, pricing
  lib/
    audit.ts           # deterministic multi-point audit engine
    knowledge-base.ts  # searchable docs for the AI assistant
    chat.ts            # intent engine + KB search (RAG fallback)
    mailerlite.ts      # MailerLite subscribe (autoresponder group)
    db.ts              # demo persistence layer (Supabase swap-in)
    supabase/          # client + server SDKs
    stripe.ts          # Stripe singleton + config
  proxy.ts             # Next 16 auth proxy (was middleware)
supabase/              # SQL schema + seed/triggers
```

### Demo mode vs. live mode

- **Demo mode** (no Supabase keys): data persists in `localStorage`
  (`src/lib/db.ts`), checkout simulates Stripe, and auth is a lightweight demo
  session. Perfect for previews.
- **Live mode** (keys present): `lib/supabase/*` becomes active, checkout
  redirects to real Stripe Checkout Sessions, and webhooks drive billing +
  fulfillment. The `proxy.ts` guards `/dashboard` and `/admin` via RLS-backed
  auth.

### The audit engine

`src/lib/audit.ts` deterministically simulates a multi-point technical & visual
audit: Local SEO, Social Content Velocity, Conversion Infrastructure, and
Reputation — each scored 0–100 and rolled into a Brand Health Score with a
letter grade, specific pain-point identifiers, keyword intelligence, and fixes
mapped to service IDs that pre-load the builder via `?preselect=1,31,41`. The
widget is **lead-gated**: name, business name, phone, and email (all required)
unlock the scan, and the lead is stored locally and pushed to `/api/leads`.

### The AI assistant

`src/lib/knowledge-base.ts` serializes the product (100+ services, 10 pillars,
6 verticals, 3 pricing tiers, marketing stats, FAQ) into searchable docs.
`src/lib/chat.ts` classifies intents (pricing, pillars, verticals, audit, ROI,
tiers, timeline, contact…) and answers from the KB with suggested-service links.
With `OPENAI_API_KEY` set, `/api/chat` upgrades to an OpenAI completion that
answers from the same retrieved context (RAG).

### Email auto-responder (MailerLite)

`src/lib/mailerlite.ts` subscribes contacts via the
`connect.mailerlite.com/api/subscribers` API. Subscribers are added to
`MAILERLITE_GROUP_ID`, which fires that group's automation / auto-responder
sequence. The audit gate and the `/contact` form both POST to `/api/leads`.

### Multi-channel video outreach (DM dispatcher)

`src/lib/services/messagingDispatcher.ts` fans a generated pitch link out to
Instagram DMs, Facebook Messenger, WhatsApp, and TikTok through one unified
payload (`leadName`, `businessName`, `videoUrl`, `platformHandle`,
`phoneNumber`, `pageId`). Channel adapters live in
`src/lib/services/messaging/` and every attempt is persisted to
`public.outreach_logs` (run `supabase/migrations/003_outreach_logs.sql`).

```bash
# Fan out a stored prospect's pitch across every channel it has a handle for
curl -X POST http://localhost:3000/api/outreach/dispatch \
  -H 'Content-Type: application/json' \
  -d '{"prospectId":"<uuid>","channels":["instagram","whatsapp"]}'

# Or dispatch an explicit payload
curl -X POST http://localhost:3000/api/outreach/dispatch \
  -H 'Content-Type: application/json' \
  -d '{"businessName":"Acme Dental","leadName":"Dr. Lee",
       "videoUrl":"https://loom.com/share/abc",
       "thumbnailUrl":"https://…/thumb.jpg",
       "channels":["whatsapp"],"phoneNumber":"7725550123"}'

# Queue status feed / manual retry / cron retry
curl 'http://localhost:3000/api/outreach/logs?status=failed'
curl -X POST http://localhost:3000/api/outreach/retry -d '{"id":"<log-uuid>"}'
curl -H "Authorization: Bearer $CRON_SECRET" \
  'http://localhost:3000/api/outreach/retry'
```

#### Cold-handle manual queue

Meta and WhatsApp only allow proactive API messages inside their platform
rules. Handles without an IGSID/PSID (typical scraped IG/TikTok leads) must not
be sent through Graph. Queue them instead — the scraper posts batches and an
operator (or an extension bridge) completes each row from the admin queue:

```bash
# Enqueue scraped cold leads (no provider call, deduped per channel+handle)
curl -X POST http://localhost:3000/api/outreach/queue \
  -H 'Content-Type: application/json' \
  -d '{"leads":[
    {"leadName":"Dr. Lee","businessName":"Acme Dental",
     "videoUrl":"https://loom.com/share/abc",
     "channel":"instagram","platformHandle":"@acmedental"},
    {"leadName":"Mia","businessName":"Mia Roofing",
     "videoUrl":"https://loom.com/share/def",
     "channel":"tiktok","platformHandle":"miaroofing"}
  ]}'

# Complete a manual row after sending (this fires the GHL video_sent_* tags)
curl -X POST http://localhost:3000/api/outreach/manual \
  -H 'Content-Type: application/json' \
  -d '{"id":"<log-uuid>","action":"sent"}'

# Or hand it to an optional extension/automation bridge
curl -X POST http://localhost:3000/api/outreach/manual \
  -H 'Content-Type: application/json' \
  -d '{"id":"<log-uuid>","action":"bridge"}'
```

Machine-to-machine intake (local scraper/cron) can skip the admin session with
`Authorization: Bearer $SCRAPER_WEBHOOK_SECRET` (or `CRON_SECRET`, or the
`x-bizreborn-secret` header). The Maps scraper no longer drops leads that lack
an email: social/phone-only businesses are saved and, once their pitch video is
rendered, automatically queued when `OUTREACH_QUEUE_ON_READY=1`. Scope a batch
with `OUTREACH_QUEUE_CITIES` (e.g. `Vero Beach,Indian River,Sebastian,Stuart`)
and choose platforms with `OUTREACH_QUEUE_CHANNELS` (default
`instagram,facebook,tiktok`; add `whatsapp` only after template approval).

Manual rows show **Open** (deep link to the IG/Messenger/TikTok profile or a
prefilled `wa.me` chat), **Copy** (pitch text), **Bridge** (when
`MANUAL_DM_BRIDGE_URL` is set), **Mark sent**, and **Skip** in
`/admin/outreach`. Nothing is marked sent until a human or bridge confirms it,
so CRM tags stay honest. API dispatch (`/api/outreach/dispatch`) remains the
path for warm inbound leads, comment-to-DM triggers, and approved WhatsApp
template sends.

The queue is visible at **Admin → Outreach Queue** (`/admin/outreach`), and
every prospect row in the CRM has a **Video DM** action that fans out to the
handles stored on the lead.

Webhooks (configure in the Meta app / TikTok partner dashboard):

- `GET|POST /api/webhooks/messaging/instagram`
- `GET|POST /api/webhooks/messaging/facebook`
- `GET|POST /api/webhooks/messaging/whatsapp`
- `POST /api/webhooks/messaging/tiktok`

Delivery/read receipts advance the log (`sent → delivered → read`), inbound
replies set `replied` and append a communication log to the prospect, and every
event posts tags to `GHL_WEBHOOK_URL` (e.g. `video_sent_ig`,
`video_sent_whatsapp`, `video_replied_whatsapp`). Meta and WhatsApp webhooks
require a valid `X-Hub-Signature-256`; TikTok is signature-checked when
`TIKTOK_WEBHOOK_SECRET` is set. Failed sends retry with exponential backoff up
to `MESSAGING_MAX_ATTEMPTS`, honoring `Retry-After` and Graph/WhatsApp rate
limits.

> **Compliance:** Instagram/Messenger and WhatsApp only allow proactive
> messages inside their platform rules (Messenger's 24-hour window + approved
> tags; WhatsApp's 24-hour window or an approved template). The adapters surface
> the provider's exact error code instead of silently retrying an ineligible
> send. Instagram/Messenger also require an IGSID/PSID — map known handles via
> `INSTAGRAM_HANDLE_TO_ID` / `FACEBOOK_HANDLE_TO_ID`, or queue cold handles in
> the manual cold-outreach queue. Meta message tags do not authorize cold sales
> outreach; use an approved WhatsApp template for first touch.

---

## Scripts

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build
npm run lint       # ESLint (flat config, Next 16)
npm start          # serve the production build
```

## Tooling notes (Next.js 16)

- Async request APIs (`params`/`searchParams` must be awaited).
- `middleware` is now `proxy` (`src/proxy.ts`, Node runtime).
- `next lint` was removed — use `eslint` directly.
- Turbopack is the default bundler.
