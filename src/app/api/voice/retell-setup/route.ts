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

  return NextResponse.json({
    ok: true,
    agentId,
    tools: Array.from(byName.keys()),
    webhook: url,
    note: "Agent updated — the four tools are live. The agent will execute them mid-call when the client asks.",
  });
}
