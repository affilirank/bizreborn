/**
 * Deterministic intent classification over AI-call transcripts.
 *
 * Runs on every call_ended webhook: detects what the client asked for so the
 * system can act on it (book a call, send the audit, stop calling) and whether
 * the actual owner was reached (retry logic keys off this).
 */

export interface CallIntentFlags {
  book_call: boolean;
  send_audit: boolean;
  stop_calling: boolean;
  owner_reached: boolean;
  not_interested: boolean;
}

const BOOK_PATTERNS = [
  /\bbook (a|the)?\s*(call|meeting|appointment|slot|time)\b/i,
  /\bschedule (a|the)?\s*(call|meeting|appointment|time|slot)\b/i,
  /\bset (up|a) (a\s+)?(call|time|meeting)\b/i,
  /\b(what|when).{0,20}(work|available|free)\b.{0,30}\b(today|tomorrow|next week|monday|tuesday|wednesday|thursday|friday)\b/i,
  /\bi(')?(d| would|'d)? (like|want) to (book|schedule)\b/i,
  /\bput (me|us) (down|in) for\b/i,
  /\bmove forward\b/i,
  /\blet'?s do (it|this)\b/i,
  /\bi('?m| am) interested\b/i,
];

const AUDIT_PATTERNS = [
  /\bsend (me )?(the |that |your )?(audit|report|video|pitch|proposal|link|info)\b/i,
  /\bemail (me )?(the |that |your )?(audit|report|video|pitch|proposal|link|info)\b/i,
  /\btext (me )?(the |that |your )?(audit|link|info)\b/i,
  /\b(yeah|yes|sure|okay|ok),? (send|email) (it|that|them|the link)\b/i,
  /\bsounds good,? (send|email)\b/i,
  /\bcan you (send|email) (it|that|me)\b/i,
];

const STOP_PATTERNS = [
  /\bstop calling\b/i,
  /\bstop (these|the) calls?\b/i,
  /\btake (me|us) off (your|the) (list|call)\b/i,
  /\bdo(n'?t| not) call (me |us |again|here)\b/i,
  /\bremove (me|us|my number)\b/i,
  /\bnever call\b/i,
  /\bunsubscribe\b/i,
];

const NOT_INTERESTED_PATTERNS = [
  /\bnot interested\b/i,
  /\bno (thanks|thank you|interest)\b/i,
  /\bwe('re| are) (good|all set|fine)\b/i,
  /\bdon'?t need\b/i,
  /\balready have (a|an|someone)\b/i,
];

const OWNER_PATTERNS = [
  /\b(i'?m|this is|speaking|it'?s) (the )?(owner|proprietor|founder|ceo)\b/i,
  /\bi own (the|this) (business|place|shop|company)\b/i,
  /\byes,? (this is|speaking)\b/i,
  /\bgo(ing)? ahead\b/i,
];

const GATEKEEPER_PATTERNS = [
  /\b(he|she|they)'?s not (available|in|here|around)\b/i,
  /\bcan (i|you) take a message\b/i,
  /\bcall (back|again) later\b/i,
  /\bwho'?s (calling|this)\b/i,
  /\b(i'?m|this is) (the )?(manager|assistant|receptionist|employee)\b/i,
  /\b(he|she)'?s (with a )?(customer|client|busy)\b/i,
];

export function classifyCallTranscript(
  userLines: string[],
  opts: { disconnectionReason?: string; callSuccessful?: boolean | null } = {},
): CallIntentFlags {
  const joined = userLines.join(" ");
  const flags: CallIntentFlags = {
    book_call: BOOK_PATTERNS.some((r) => r.test(joined)),
    send_audit: AUDIT_PATTERNS.some((r) => r.test(joined)),
    stop_calling: STOP_PATTERNS.some((r) => r.test(joined)),
    owner_reached: false,
    not_interested: NOT_INTERESTED_PATTERNS.some((r) => r.test(joined)),
  };

  const gatekeeper = GATEKEEPER_PATTERNS.some((r) => r.test(joined));
  const ownerSignal = OWNER_PATTERNS.some((r) => r.test(joined));
  const voicemail = /voicemail|voice ?mail|no ?answer|not picked up/i.test(opts.disconnectionReason ?? "");

  flags.owner_reached = !voicemail && !gatekeeper && (ownerSignal || userLines.length >= 3);
  if (flags.stop_calling) flags.owner_reached = true; // they told us to stop — honor it regardless
  return flags;
}

export function intentSummary(flags: CallIntentFlags): string {
  const parts: string[] = [];
  if (flags.book_call) parts.push("wants to book a call");
  if (flags.send_audit) parts.push("wants the audit emailed");
  if (flags.stop_calling) parts.push("ASKED US TO STOP CALLING");
  if (flags.not_interested && !flags.stop_calling) parts.push("not interested");
  if (flags.owner_reached && !flags.stop_calling) parts.push("owner reached");
  return parts.length > 0 ? parts.join(" · ") : "no explicit ask";
}
