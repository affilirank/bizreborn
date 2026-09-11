import type { CommunicationLog, Prospect } from "@/lib/supabase-types";

/**
 * CRM pipeline (temperature).
 *
 * Every prospect starts at Cold and climbs one way — forward only — as the
 * team actually contacts and reaches the lead:
 *   welcome/outreach -> Warm, opened/answered/meeting -> Hot,
 *   proposal -> Proposal Sent, acceptance -> Client (Active).
 *
 * Stored in its own `temperature` column so it never collides with `status`
 * (the pitch-video render state: "ready"/"saved"/…).
 *
 * Pure + client-safe (no server imports) so the CRM UI, server routes, and
 * webhooks can all share the exact same pipeline rules.
 */
export const PIPELINE_ORDER = [
  "Cold",
  "Warm",
  "Hot",
  "Replied",
  "Proposal Sent",
  "Client (Active)",
] as const;

export type PipelineTemp = (typeof PIPELINE_ORDER)[number];

/** Display list for selects/filters — exported as plain string[] for UI use. */
export const TEMPERATURES: string[] = [...PIPELINE_ORDER];

export type PipelineTrigger =
  | "welcome"
  | "outreach"
  | "opened"
  | "answered"
  | "proposal"
  | "meeting";

const TERMINAL_RENDER_STATES = new Set(["ready", "saved", "pending", "new", "active", "closed"]);

const STAGE_ALIASES: Record<string, PipelineTemp> = {
  "client-active": "Client (Active)",
  clientactive: "Client (Active)",
  client: "Client (Active)",
  pitched: "Proposal Sent",
  sent: "Proposal Sent",
  proposal: "Proposal Sent",
  replied: "Replied",
  answered: "Replied",
  "in-progress": "Hot",
  interested: "Hot",
  hot: "Hot",
  warm: "Warm",
  active: "Warm",
  cold: "Cold",
  new: "Cold",
};

export function normalizeTemp(raw: string | null | undefined): PipelineTemp {
  const c = (raw ?? "").trim().toLowerCase();
  if (!c) return "Cold";
  if (TERMINAL_RENDER_STATES.has(c)) {
    // "ready"/"saved" are pitch-video render states, not pipeline stages.
    return "Cold";
  }
  if ((PIPELINE_ORDER as readonly string[]).includes(c)) return c as PipelineTemp;
  return STAGE_ALIASES[c] ?? "Warm";
}

const TEMP_RANK = new Map<string, number>(PIPELINE_ORDER.map((t, i) => [t, i]));

export function prospectTemperature(p: Pick<Prospect, "temperature" | "status">): PipelineTemp {
  return normalizeTemp(p.temperature ?? p.status);
}

export function nextPipelineStatus(
  current: string | null | undefined,
  trigger: PipelineTrigger | string,
): PipelineTemp {
  const cur = normalizeTemp(current);
  const curIdx = TEMP_RANK.get(cur) ?? 0;

  const target: PipelineTemp =
    trigger === "welcome" || trigger === "outreach"
      ? "Warm"
      : trigger === "opened" || trigger === "answered" || trigger === "meeting"
        ? "Hot"
        : trigger === "proposal"
          ? "Proposal Sent"
          : cur;

  const tIdx = TEMP_RANK.get(target) ?? curIdx;
  return tIdx > curIdx ? target : cur;
}

export function logMeta(log: CommunicationLog): Record<string, unknown> {
  return (log.meta as Record<string, unknown>) ?? {};
}

export function emailStats(
  p: Pick<Prospect, "communication_logs">,
): { sends: number; opens: number; rate: number } {
  const logs = p.communication_logs ?? [];
  const emailLogs = logs.filter((l) => {
    const kind = logMeta(l).kind;
    return kind === "email" || kind === "welcome" || kind === "drip";
  });
  const sends = emailLogs.filter((l) => logMeta(l).status === "sent").length;
  const opens = emailLogs.filter((l) => Number(logMeta(l).opens ?? 0) > 0).length;
  return { sends, opens, rate: sends > 0 ? Math.round((opens / sends) * 100) : 0 };
}