import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * One-click Retell agent tool registration.
 *
 * Fetches the configured agent, merges the four call-to-action custom tools
 * into its tool list (never removing existing ones), and updates it. The
 * agent can then execute tasks LIVE when the client asks: send the audit,
 * book a call, move forward, or stop calling.
 */
const TOOL_SPEC = {
  type: "custom",
  deployment: "webhook",
  webhook_url: "",
};

function toolUrl(base: string) {
  return `${base}/api/voice/retell-tool`;
}

export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const key = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;
  if (!key || !agentId) {
    return NextResponse.json({ error: "RETELL_API_KEY / RETELL_AGENT_ID not configured." }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const url = toolUrl(base);

  const getRes = await fetch(`https://api.retellai.com/get-agent/${agentId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const agent = await getRes.json().catch(() => ({}));
  if (!getRes.ok) {
    return NextResponse.json({ error: `Could not fetch agent: ${(agent as Record<string, unknown>)?.message ?? getRes.status}` }, { status: 400 });
  }

  const existing = Array.isArray((agent as Record<string, unknown>).tools) ? ((agent as Record<string, unknown>).tools as Array<Record<string, unknown>>) : [];
  const byName = new Map(existing.map((t) => [String(t.name ?? "").toLowerCase(), t]));

  const tools = [
    {
      ...TOOL_SPEC,
      name: "send_audit",
      description: "Emails the client their custom audit/proposal link right now. Use when the client asks you to send the audit, report, proposal, or more info by email.",
      webhook_url: url,
    },
    {
      ...TOOL_SPEC,
      name: "book_call",
      description: "Places a strategy-call booking hold and confirms the time. Use when the client wants to book, schedule a call, or move forward.",
      webhook_url: url,
    },
    {
      ...TOOL_SPEC,
      name: "stop_calling",
      description: "Permanently opts this business out of future calls. Use when the client says stop calling, take me off the list, or do not call again.",
      webhook_url: url,
    },
  ];
  for (const t of tools) {
    byName.set(String(t.name), t); // upsert by name (re-points webhook if base changed)
  }

  const patchRes = await fetch("https://api.retellai.com/update-agent", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ agent_id: agentId, tools: Array.from(byName.values()) }),
  });
  const patched = await patchRes.json().catch(() => ({}));
  if (!patchRes.ok) {
    return NextResponse.json({ error: `Agent update failed: ${(patched as Record<string, unknown>)?.message ?? patchRes.status}` }, { status: 400 });
  }

  // ---- Honest-opener prompt fix ----
  // The stored agent prompt claims "you recently requested a free audit" —
  // false (these are outbound cold calls) and an instant hang-up trigger.
  // Rewrite the opening: compliment first, honest discovery framing, email ask.
  const HONEST_OPENER = `## OPENING — READ VERBATIM (overrides any earlier opening)
"Hi, this is Sarah from Biz Reborn Marketing — did I catch the business owner?"
- If NOT the owner: "No problem at all! When's a good time to catch them — or I can email the audit link straight over. Which works better?"
- If owner: "[COMPLIMENT FIRST — use the prospect's real data: 4.5+ stars → '{rating} stars across {reviews} reviews? Genuinely impressive, you clearly take great care of your customers.' / fewer reviews → '{reviews} reviews and counting — {business_name} is clearly a staple in {city}.']"
  Then: "I was researching businesses like yours in {city} this week and noticed {competitor_name} is outranking you on Google Maps right now — looks like it's mostly the {unanswered} unanswered reviews."
  Then: "I'd love to help a great business like yours claim that top 3 spot — I actually already put together a free 45-second video audit for {business_name} showing exactly how. Can I send it to your email right now?"
## CRITICAL HONESTY RULE
NEVER claim the business requested, signed up for, or booked an audit. You found them through YOUR OWN research and proactively prepared the audit FOR them. If they ask "how did you get my number?" say: "I found your business while researching top local spots in {city} — that's how the audit got built, honestly."
NEVER mention dollar losses, grades, or "audit data" in the first turn. One question max per turn.`;

  let promptFixed = false;
  const engine = (agent as Record<string, unknown>).response_engine as Record<string, unknown> | undefined;
  const llmId = engine && engine.type === "retell-llm" ? String(engine.llm_id ?? "") : "";
  if (llmId) {
    try {
      const llmRes = await fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const llm = (await llmRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (llmRes.ok && typeof llm.system_prompt === "string") {
        let prompt = String(llm.system_prompt);
        // Strip every false claim that the business requested/signed up.
        prompt = prompt.replace(/[^.\n]*(recently requested|requested a free|signed up for|opted in)[^.\n]*\.?/gi, "");
        // Prepend the override so it wins over any leftover opening text.
        prompt = `${HONEST_OPENER}\n\n${prompt}`;
        const llmPatch = await fetch("https://api.retellai.com/update-retell-llm", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ llm_id: llmId, system_prompt: prompt }),
        });
        promptFixed = llmPatch.ok;
      }
    } catch {
      // prompt patch is best-effort; tools are the critical part
    }
  }

  return NextResponse.json({
    ok: true,
    agentId,
    tools: Array.from(byName.keys()),
    webhook: url,
    promptFixed,
    note: promptFixed
      ? "Agent updated — tools registered AND the opening prompt rewritten (compliment-first, no false 'you requested' claim)."
      : "Agent updated — tools registered. Prompt auto-fix skipped (agent doesn't use a Retell-managed LLM prompt) — update the opener manually in the Retell dashboard.",
  });
}
