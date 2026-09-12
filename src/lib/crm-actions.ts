import type { CommunicationLog, Prospect } from "@/lib/supabase-types";
import { updateProspect } from "@/lib/prospects";
import { renderProfessionalEmailHtml, sanitizeOutreachCopy } from "@/lib/email-template";
import { canReceiveEmail } from "@/lib/services/email-validate";
import {
  PIPELINE_ORDER,
  emailStats,
  logMeta,
  nextPipelineStatus,
  prospectTemperature,
  type PipelineTrigger,
  type PipelineTemp,
} from "@/lib/pipeline";

/**
 * Cloud-side CRM actions. Server-only (imports the prospects store).
 * Pure pipeline rules live in `@/lib/pipeline` (client-safe).
 */

export {
  PIPELINE_ORDER,
  emailStats,
  logMeta,
  nextPipelineStatus,
  prospectTemperature,
};
export type { PipelineTrigger, PipelineTemp };

export function makeLog(
  type: string,
  notes: string,
  meta?: CommunicationLog["meta"],
): CommunicationLog {
  return { date: new Date().toISOString(), type, notes, admin: "System", ...(meta ? { meta } : {}) };
}

/**
 * Appends a communication log entry and last_contacted_at, optionally
 * advancing the pipeline temperature. Never demotes a temperature.
 */
export function applyContactLog(
  p: Prospect,
  log: CommunicationLog,
  trigger: PipelineTrigger | null,
): Promise<Prospect | null> {
  const logs = p.communication_logs ?? [];
  const patch: Record<string, unknown> = {
    communication_logs: [log, ...logs],
    last_contacted_at: new Date().toISOString(),
  };
  if (trigger) {
    const next = nextPipelineStatus(p.temperature ?? p.status, trigger);
    if (next !== prospectTemperature(p)) patch.temperature = next;
  }
  return updateProspect(p.id, patch);
}

type EmailKind = "email" | "welcome" | "drip";

interface DeliverEmailOptions {
  prospect: Prospect;
  subject: string;
  html: string;
  kind: EmailKind;
  stepLabel?: string;
  trigger?: PipelineTrigger;
}

export interface DeliverEmailResult {
  ok: boolean;
  simulated: boolean;
  messageId?: string;
  trackingUid: string;
  error?: string;
  prospect?: Prospect | null;
}

function makeUid(seed: string): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") {
      const u = c.randomUUID();
      if (typeof u === "string" && u.length > 8) return `${seed}:${u}`;
    }
  } catch {
    // fall through
  }
  return `${seed}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function injectTrackingPixel(html: string, uid: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";
  const pixel = `<img src="${base}/api/tracking/open/${encodeURIComponent(uid)}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
  return html.replace("</body>", `${pixel}</body>`);
}

/**
 * Sends an email through Resend (when configured), appends a proof-of-send
 * communication log entry (with tracking uid for real open tracking), and
 * advances the pipeline. Never throws.
 */
export async function deliverEmail(opts: DeliverEmailOptions): Promise<DeliverEmailResult> {
  const { prospect, subject, html, kind, stepLabel, trigger } = opts;
  if (!prospect.email) {
    return {
      ok: false,
      simulated: false,
      trackingUid: makeUid(prospect.id),
      error: "Prospect has no email address.",
    };
  }

  // Hard gate: never send to a domain that cannot actually receive mail
  // (invented/parked/dead addresses are exactly what was hard-bouncing).
  const deliverable = await canReceiveEmail(prospect.email);
  if (!deliverable) {
    return {
      ok: false,
      simulated: false,
      trackingUid: makeUid(prospect.id),
      error: `Recipient domain ${prospect.email.split("@")[1]} has no MX record (cannot receive mail). Send blocked — fix the address or mark the lead invalid.`,
    };
  }

  const trackingUid = makeUid(prospect.id);
  // Backstop: no placeholder like [Your Name] may ever reach a recipient,
  // even from hand-written custom HTML or the welcome template.
  const cleanSubject = sanitizeOutreachCopy(subject, prospect);
  const cleanHtml = sanitizeOutreachCopy(html, prospect);
  const htmlWithPixel = injectTrackingPixel(cleanHtml, trackingUid);

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || `Biz Reborn Marketing <hello@bizreborn.com>`;
  // Every prospect reply should land in the operator's real inbox, not a
  // brand-only From address that may have no mailbox behind it.
  const replyTo = process.env.REPLY_TO_EMAIL || "bizrebornmarketing@gmail.com";

  let messageId: string | undefined;
  let simulated = false;
  let error: string | undefined;

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [prospect.email],
          subject: cleanSubject,
          html: htmlWithPixel,
          reply_to: replyTo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        messageId = data?.id || undefined;
      } else {
        error = data?.message ?? "Resend failed to deliver email.";
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Resend exception";
    }
  } else {
    simulated = true;
  }

  const meta: CommunicationLog["meta"] = {
    kind,
    email_uid: trackingUid,
    subject: cleanSubject,
    to: prospect.email,
    sent_at: new Date().toISOString(),
    status: error ? "error" : simulated ? "simulated" : "sent",
    ...(messageId ? { message_id: messageId } : {}),
    ...(simulated ? { simulated: true } : {}),
  };

  const notes = [
    stepLabel ? `${stepLabel} · ` : "",
    `"${cleanSubject}"`,
    simulated
      ? "simulated (RESEND_API_KEY missing)"
      : error
        ? `send ERROR: ${error}`
        : `sent via Resend${messageId ? ` #${messageId.slice(0, 12)}` : ""}`,
  ].join(" ");

  const updated = await applyContactLog(
    prospect,
    makeLog("email", notes, meta),
    error ? null : (trigger ?? null),
  );

  return { ok: !error, simulated, messageId, trackingUid, error, prospect: updated };
}

/**
 * Sends the instant welcome + "free audit is coming" email the moment a
 * lead with an email address is created. Idempotent: only ever sends once
 * per lead (guarded by an existing meta.kind === "welcome" log).
 */
export async function welcomeProspect(p: Prospect): Promise<void> {
  if (!p.email) return;
  const alreadyWelcomed = (p.communication_logs ?? []).some(
    (l) => logMeta(l).kind === "welcome",
  );
  if (alreadyWelcomed) return;

  const subject = `Great news, ${p.business_name} — your free audit is on the way! 🎉`;
  const competitor = p.competitor_name ?? "the local market leader";
  const body = `Hi ${p.business_name} team,\n\nWelcome to Biz Reborn! We just added ${p.business_name} to our audit queue — your FREE local growth audit is being compiled right now.\n\nIt covers your Google map-pack standing vs ${competitor}, your review scorecard, unanswered-review leaks, and the exact fixes to lock in your Top 3 spot.\n\nYour audit link lands right back in this inbox within the next hour. Keep an eye out — it includes a 45-second video walkthrough built just for ${p.business_name}.\n\nNo strings, no cost. If your listings are already perfect, you'll know in 60 seconds.`;

  const html = renderProfessionalEmailHtml({ prospect: p, subject, body, stepNumber: 1 });
  await deliverEmail({
    prospect: p,
    subject,
    html,
    kind: "welcome",
    stepLabel: "Welcome · Free Audit Incoming",
    trigger: "welcome",
  });
}

/**
 * Builds a contact-outcome log entry (used by call routes to record an
 * outbound attempt / an answer without a full email delivery).
 */
export function makeContactLog(opts: {
  kind: string;
  trigger?: PipelineTrigger;
  stepLabel?: string;
  outcome?: string | null;
}): CommunicationLog {
  const { kind, trigger, stepLabel, outcome } = opts;
  const meta: CommunicationLog["meta"] = { kind };
  if (trigger) meta.trigger = trigger;
  if (outcome) meta.outcome = outcome;
  return makeLog(
    "call",
    [stepLabel, outcome ? `· ${outcome}` : ""].filter(Boolean).join(" ") || `AI call · ${kind}`,
    meta,
  );
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Fires the instant welcome email for every newly-created lead that has a
 * real email address. Runs with a small concurrency limit so a big discovery
 * batch never slams Resend. Idempotent per lead.
 */
export async function welcomeCreatedProspects(rows: Prospect[]): Promise<void> {
  const targets = rows.filter((p) => p.email && EMAIL_RE.test(p.email));
  if (targets.length === 0) return;

  const queue = [...targets];
  const worker = async () => {
    while (queue.length > 0) {
      const p = queue.shift()!;
      try {
        await welcomeProspect(p);
      } catch (err) {
        console.error("[welcome] failed for", p.business_name, err);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, () => worker()));
}