# VSL Script — "Reborn In 76 Seconds"

Brand: **Biz Reborn Marketing** · Runtime: **76 seconds** · Format: 1920×1080 · 30fps
Used by: `/public/vsl.mp4` (procedural render from `/tmp/opencode/render_vsl.py`).
This script is designed to drop into third-party AI video generators (Captions, Runway, Pika, Sora, etc.) — one narration line per scene, with visual prompts and exact timings.

---

## Scene 01 · THE HOOK — 0:00–0:07

**Narration:** "Most local businesses are burning cash on marketing that never gets seen."

**Visual prompt:** Dark studio, charcoal background with faint grid. Bold white title card "STOP BURNING CASH ON MARKETING NOBODY SEES." burning-in, red accent line. Gold "$" symbols drifting upward and dissolving into embers.

**On-screen text:**
- STOP BURNING CASH (white, large)
- ON MARKETING NOBODY SEES. (red, large)
- Your website. Your ads. Your content. Nobody sees any of it.

---

## Scene 02 · THE COMPETITOR — 0:07–0:14

**Narration:** "While a competitor with more Google reviews quietly takes your customers."

**Visual prompt:** Same dark studio. White headline, indigo accent line. A review card fades in: five amber stars filling one by one, rating counter ticking up from 3.4 → 4.8.

**On-screen text:**
- WHILE YOUR COMPETITOR (white, large)
- QUIETLY TAKES YOUR CUSTOMERS (indigo, large)
- 4.8 — Google Reviews, stacking up every day

---

## Scene 03 · THE SYSTEM — 0:14–0:22

**Narration:** "In this video, I'll show you the exact system we use to make local businesses the only name in town."

**Visual prompt:** The Biz Reborn logo mark (indigo rounded square, emerald bolt) rises and locks center. White promise line and supporting copy slide in beneath it.

**On-screen text:**
- I'LL SHOW YOU THE EXACT SYSTEM
- that makes you the only name in town.
- Three engines. One mission: local category leadership.

---

## Scene 04 · THREE ENGINES — 0:22–0:30

**Narration:** "Three engines. One mission: turn invisible businesses into local category leaders."

**Visual prompt:** Title at top. Three glass cards sweep in left-to-right — each with a numbered badge and accent color:
01 AI BRAND AUDIT (indigo) · 02 100-MODULE MENU (emerald) · 03 AUTOMATION (amber).

**On-screen text:**
- THREE ENGINES. ONE MISSION.
- 01 AI BRAND AUDIT — Find every leak in seconds.
- 02 100-MODULE MENU — Pick exactly what you need.
- 03 AUTOMATION — Reviews, SMS & content.

---

## Scene 05 · ENGINE ONE — THE AUDIT — 0:30–0:38

**Narration:** "Engine One — the AI Brand Audit. We find every leak in your marketing in seconds."

**Visual prompt:** Title at top. A circular gauge sweeps from 120° to 420°, indigo arc with emerald leading edge. Score counts up 12 → 88 in large type.

**On-screen text:**
- ENGINE ONE — THE AI BRAND AUDIT
- 88 — BRAND HEALTH SCORE
- Grade A once the gaps are fixed

---

## Scene 06 · ENGINE TWO — THE MENU — 0:38–0:46

**Narration:** "Engine Two — a 100-module service menu. Pick exactly what you need. No agency lock-in."

**Visual prompt:** Title at top, subtitle below. A 4×3 grid of service-module cards fills in one by one with numbered badges, one card highlighted indigo.

**On-screen text:**
- ENGINE TWO — THE 100-MODULE MENU
- Pick exactly what you need. No agency lock-in.
- 100 modules · 10 pillars · 6 industries

---

## Scene 07 · ENGINE THREE — AUTOMATION — 0:46–0:54

**Narration:** "Engine Three — automated reviews, SMS, and content that work while you sleep."

**Visual prompt:** Title at top. Three horizontal glass rows slide in: Reviews (emerald ★), SMS (indigo ✉), Content (amber ▶), each with a green checkmark.

**On-screen text:**
- ENGINE THREE — AUTOMATION
- Reviews — posted automatically
- SMS — replied in 3 seconds
- Content — scheduled to 5 platforms

---

## Scene 08 · THE PROOF — 0:54–1:02

**Narration:** "Every dollar tracked. Every lead attributed. Every result reported."

**Visual prompt:** Title at top. Four KPI tiles bounce in: 88% · 76% · 300% · 7.4x, each with a caption line in emerald/indigo/amber.

**On-screen text:**
- 88% of mobile local searchers call or visit within 24h
- 76% of local searches lead to a same-day call
- 300% more leads convert with video + SMS response
- 7.4x projected ROAS on tracked campaigns
- Live ROI dashboard — no more guessing

---

## Scene 09 · YOUR MOVE — 1:02–1:16

**Narration:** "If you're ready to stop guessing and start dominating — run your free AI audit now."

**Visual prompt:** Indigo glow pulse behind large type. A big indigo button with emerald outline and arrow pulses: "RUN FREE AI BRAND AUDIT".

**On-screen text:**
- STOP GUESSING. (white)
- START DOMINATING. (emerald)
- RUN FREE AI BRAND AUDIT →
- bizreborn.marketing · no credit card required

---

## Persistent Chrome (all scenes)

- Top-left: Biz Reborn logo mark + "Biz REBORN MARKETING" wordmark.
- Top-center: scene label pill (e.g. "01 · THE HOOK").
- Bottom: black caption bar with the narration line, plus a segmented indigo→emerald progress bar.
- Ambient: drifting indigo/emerald glow blobs, subtle grid, vignette, bottom fade.

---

## How to use in a third-party generator

1. Paste each scene's **Narration** as a timed voiceover line at the listed start time.
2. Use the **Visual prompt** as the image/video-generation prompt for that clip.
3. Overlay the **On-screen text** at the same timing (or reuse `/public/vsl.srt`).
4. Render at 1920×1080, 30fps, H.264 + `-movflags +faststart` for web playback.
