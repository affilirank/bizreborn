import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { getProspectById } from "@/lib/prospects";
import type { OutreachChannel, Prospect } from "@/lib/supabase-types";
import { inferChannels, queueManualOutreach } from "@/lib/services/messagingDispatcher";
import type {
  VideoPitchMetadata,
  VideoPitchPayload,
} from "@/lib/services/messaging/types";
import {
  absoluteUrl,
  channelsFromInput,
  clean,
  isRecord,
  socialHandle,
} from "@/lib/services/messaging/request";
import { hasContactedOutreach } from "@/lib/services/messaging/outreach-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_LEADS = 100;

type LeadInput = Record<string, unknown>;

/**
 * Machine auth for local scraper batches. Send either
 * `Authorization: Bearer $SCRAPER_WEBHOOK_SECRET` (or CRON_SECRET), or the
 * `x-bizreborn-secret` header. Admin sessions still work in the UI.
 */
function isAutomationAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const header = req.headers.get("x-bizreborn-secret") ?? "";
  const scraperSecret = process.env.SCRAPER_WEBHOOK_SECRET?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (scraperSecret && (auth === `Bearer ${scraperSecret}` || header === scraperSecret)) {
    return true;
  }
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return false;
}

function prospectHandle(
  prospect: Prospect | null,
  channel: OutreachChannel,
): string | null {
  if (!prospect) return null;
  switch (channel) {
    case "instagram":
      return socialHandle(prospect.instagram ?? null);
    case "facebook":
      return socialHandle(prospect.facebook ?? null);
    case "tiktok":
      return socialHandle(prospect.tiktok ?? null);
    case "whatsapp":
      return prospect.phone ?? null;
  }
}

function leadList(body: Record<string, unknown>): LeadInput[] {
  if (Array.isArray(body.leads)) return body.leads.filter(isRecord);
  if (Array.isArray(body.items)) return body.items.filter(isRecord);
  if (isRecord(body.lead)) return [body.lead];
  return [body];
}

/**
 * POST /api/outreach/queue
 *
 * Cold-outreach intake for scraped leads. Nothing is sent through a provider:
 * each handle/phone number becomes a `queued` row with `delivery_mode=manual`
 * so it can be worked from /admin/outreach (IG/Messenger/TikTok deep link +
 * copy + mark sent) or an optional browser-extension bridge.
 *
 * Body:
 *   { "leads": [ { "leadName", "businessName", "videoUrl", "platformHandle",
 *                  "channel", "phoneNumber", "prospectId" } ] }
 * or a single lead object at the top level.
 */
export async function POST(req: Request) {
  const automation = isAutomationAuthorized(req);
  if (!automation && !(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const leads = leadList(body).slice(0, MAX_LEADS);
  if (leads.length === 0) {
    return NextResponse.json(
      { error: "Pass a lead object or { leads: [...] } to queue." },
      { status: 400 },
    );
  }

  const requestedBy = `admin:${req.headers.get("x-forwarded-for") ?? "queue"}`;
  const prospectCache = new Map<string, Prospect | null>();
  const results: Array<{
    index: number;
    leadName: string | null;
    businessName: string | null;
    channels: OutreachChannel[];
    queued: number;
    failed: number;
    skipped?: number;
    error?: string;
    results?: Awaited<ReturnType<typeof queueManualOutreach>>["results"];
  }> = [];

  for (const [index, lead] of leads.entries()) {
    const prospectId =
      clean(lead.prospectId) || clean(lead.prospect_id) || clean(lead.id);
    let prospect: Prospect | null = null;
    if (prospectId) {
      if (prospectCache.has(prospectId)) {
        prospect = prospectCache.get(prospectId) ?? null;
      } else {
        prospect = await getProspectById(prospectId);
        prospectCache.set(prospectId, prospect);
      }
      if (!prospect) {
        results.push({
          index,
          leadName: clean(lead.leadName),
          businessName: clean(lead.businessName),
          channels: [],
          queued: 0,
          failed: 1,
          error: "Prospect not found.",
        });
        continue;
      }
    }

    const requestedChannels = channelsFromInput(lead.channels, lead.channel);
    const singleChannel = requestedChannels.length === 1 ? requestedChannels[0] : null;
    const platformHandle = clean(lead.platformHandle);
    const leadHandles = isRecord(lead.handles) ? lead.handles : {};
    const handleFor = (channel: OutreachChannel) =>
      clean(leadHandles[channel]) ||
      (singleChannel === channel ? platformHandle : null) ||
      prospectHandle(prospect, channel);

    const handles: Partial<Record<OutreachChannel, string | null>> = {
      instagram: handleFor("instagram"),
      facebook: handleFor("facebook"),
      tiktok: handleFor("tiktok"),
      whatsapp:
        clean(leadHandles.whatsapp) ||
        clean(lead.phoneNumber) ||
        (singleChannel === "whatsapp" ? platformHandle : null) ||
        prospect?.phone ||
        null,
    };

    const businessName =
      clean(lead.businessName) || prospect?.business_name || null;
    const leadName = clean(lead.leadName) || businessName || "there";
    const videoUrl = absoluteUrl(
      clean(lead.videoUrl) ||
        prospect?.video_url ||
        (prospect?.slug ? `/pitch/${prospect.slug}` : null),
    );
    const thumbnailUrl = absoluteUrl(
      clean(lead.thumbnailUrl) || prospect?.thumbnail_url || null,
    );

    if (!businessName) {
      results.push({
        index,
        leadName,
        businessName,
        channels: requestedChannels,
        queued: 0,
        failed: 1,
        error: "businessName is required (or pass a valid prospectId).",
      });
      continue;
    }
    if (!videoUrl) {
      results.push({
        index,
        leadName,
        businessName,
        channels: requestedChannels,
        queued: 0,
        failed: 1,
        error: "videoUrl is required (or generate a pitch video for the prospect first).",
      });
      continue;
    }

    const metadataInput = isRecord(lead.metadata)
      ? (lead.metadata as VideoPitchMetadata)
      : {};
    const metadata: VideoPitchMetadata = {
      ...metadataInput,
      email: clean(metadataInput.email) || prospect?.email || undefined,
      ghlContactId:
        clean(lead.ghlContactId) || clean(metadataInput.ghlContactId) || undefined,
      skipGhl: lead.skipGhl === true || metadataInput.skipGhl,
    };

    const payload: VideoPitchPayload = {
      leadName,
      businessName,
      videoUrl,
      channel: singleChannel,
      platformHandle,
      phoneNumber: clean(lead.phoneNumber) || prospect?.phone || null,
      pageId: clean(lead.pageId) || null,
      thumbnailUrl,
      message: clean(lead.message) || null,
      handles,
      phoneNumbers: isRecord(lead.phoneNumbers)
        ? (lead.phoneNumbers as VideoPitchPayload["phoneNumbers"])
        : undefined,
      pageIds: isRecord(lead.pageIds)
        ? (lead.pageIds as VideoPitchPayload["pageIds"])
        : undefined,
      metadata,
      prospectId: prospect?.id ?? prospectId,
    };

    const channels = requestedChannels.length
      ? requestedChannels
      : inferChannels(payload);
    if (channels.length === 0) {
      results.push({
        index,
        leadName,
        businessName,
        channels: [],
        queued: 0,
        failed: 1,
        error:
          "No channel handle. Pass channel(s) plus platformHandle/phoneNumber, or store handles on the prospect.",
      });
      continue;
    }

    // Never re-pitch a lead that was already contacted (status sent/delivered/
    // read/replied, or a stored sent_at). Check the prospect itself and each
    // channel recipient, so repeat Apify runs and re-renders are harmless.
    const contactedProspect = await hasContactedOutreach({
      prospectId: prospect?.id ?? prospectId ?? null,
    });
    const eligible: OutreachChannel[] = [];
    for (const channel of channels) {
      const recipient = payload.handles?.[channel] ?? null;
      if (!recipient || !(await hasContactedOutreach({ channel, recipient }))) {
        eligible.push(channel);
      }
    }

    if (contactedProspect || eligible.length === 0) {
      results.push({
        index,
        leadName,
        businessName,
        channels,
        queued: 0,
        failed: 0,
        skipped: channels.length,
        error: "Already contacted on these channels — not re-queued.",
      });
      continue;
    }

    const summary = await queueManualOutreach({
      payload,
      channels: eligible,
      prospect,
      requestedBy,
    });
    results.push({
      index,
      leadName,
      businessName,
      channels,
      queued: summary.queued,
      failed: summary.failed,
      skipped: channels.length - eligible.length,
      results: summary.results,
    });
  }

  const queued = results.reduce((sum, lead) => sum + lead.queued, 0);
  const failed = results.reduce((sum, lead) => sum + lead.failed, 0);
  const skipped = results.reduce((sum, lead) => sum + (lead.skipped ?? 0), 0);

  return NextResponse.json({
    success: failed === 0,
    queued,
    failed,
    skipped,
    leads: results,
    message:
      failed === 0
        ? `${queued} message${queued === 1 ? "" : "s"} waiting in the manual queue${skipped ? `, ${skipped} already-contacted channel(s) skipped` : ""}. Open /admin/outreach to send.`
        : `${queued} queued, ${failed} could not be queued${skipped ? `, ${skipped} skipped` : ""}.`,
  });
}
