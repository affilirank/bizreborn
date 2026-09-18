import { scrapeReputation } from "@/lib/services/scraper";
import { buildBrandAudit } from "@/lib/services/brand-audit";
import { generatePitchScript } from "@/lib/services/script";
import { generateVoiceover } from "@/lib/services/tts";
import { renderPitchVideo } from "@/lib/services/renderer";
import {
  getProspectById,
  setProspectStatus,
  updateProspect,
} from "@/lib/prospects";
import type { Prospect } from "@/lib/supabase-types";
import { LEADGEN } from "@/lib/config";

export interface QueueEvent {
  id: string;
  status: Prospect["status"];
  error?: string | null;
}

type Listener = (event: QueueEvent) => void;

/**
 * Async batch pipeline with limited concurrency.
 *
 * For each prospect: scrape -> script -> voiceover -> render. Status is pushed
 * back to the store (and broadcast to any UI listeners) at each stage so the
 * admin dashboard can show live progress. Concurrency is capped to avoid
 * choking the CPU (default 3).
 */
class BatchQueue {
  private active = new Set<string>();
  private queue: string[] = [];
  private listeners = new Set<Listener>();
  private processing = false;
  private concurrency = LEADGEN.defaultConcurrency;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  enqueue(ids: string[]) {
    this.queue.push(...ids);
    this.tick();
  }

  size(): number {
    return this.queue.length + this.active.size;
  }

  /** Resolves once every queued prospect has finished (for serverless `after()`). */
  whenIdle(): Promise<void> {
    if (this.size() === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private idleWaiters: Array<() => void> = [];

  private settleIdle() {
    if (this.size() > 0) return;
    const waiters = this.idleWaiters;
    this.idleWaiters = [];
    waiters.forEach((w) => w());
  }

  private emit(event: QueueEvent) {
    for (const fn of this.listeners) fn(event);
  }

  private tick() {
    if (this.processing) return;
    this.processing = true;
    this.pump();
  }

  private async pump() {
    while (
      this.queue.length > 0 &&
      this.active.size < this.concurrency
    ) {
      const id = this.queue.shift()!;
      this.active.add(id);
      this.process(id).finally(() => {
        this.active.delete(id);
        this.pump();
        this.settleIdle();
      });
    }
    this.processing = false;
  }

  private process(id: string): Promise<void> {
    return processProspectPipeline(id, (event) => this.emit(event)).then(() => undefined);
  }
}

export const batchQueue = new BatchQueue();

/**
 * Full audit→script→voiceover→render pipeline for ONE prospect, standalone so
 * an API route can run it inline within its own 60s function lifetime.
 *
 * (The in-memory queue above dies with its serverless invocation — a 12-lead
 * CSV needs ~6 minutes of work, far beyond what `after()` can keep alive, so
 * batch imports drive one pipeline per function invocation instead.)
 */
export async function processProspectPipeline(
  id: string,
  emit: (event: QueueEvent) => void = () => {},
): Promise<QueueEvent> {
  const prospect = await getProspectById(id);
  if (!prospect) return { id, status: "failed", error: "prospect not found" };

  try {
    // 1. Scrape reputation (or use admin manual stats override if provided)
    await setProspectStatus(id, "scraping");
    emit({ id, status: "scraping" });
    let scraped;
    if (prospect.google_rating != null && prospect.review_count != null) {
      scraped = {
        google_rating: Number(prospect.google_rating),
        review_count: Number(prospect.review_count),
        unanswered_reviews: Number(prospect.unanswered_reviews ?? 0),
        competitor_name: prospect.competitor_name || `${prospect.business_name} Competitor`,
        competitor_reviews: Number(prospect.competitor_reviews ?? Math.round(Number(prospect.review_count) * 1.4)),
        audit_screenshot_url: prospect.audit_screenshot_url ?? "",
        website_preview_url: prospect.website_preview_url ?? "",
      };
    } else {
      scraped = await scrapeReputation({
        business_name: prospect.business_name,
        city: prospect.city ?? "",
        website: prospect.website,
        google_maps_link: prospect.google_maps_link,
        existing_email: prospect.email,
      });
      await updateProspect(id, {
        ...scraped,
        email: scraped.email ?? prospect.email ?? null,
        phone: scraped.phone ?? prospect.phone ?? null,
        website: scraped.website ?? prospect.website ?? null,
        instagram: scraped.instagram ?? prospect.instagram ?? null,
        facebook: scraped.facebook ?? prospect.facebook ?? null,
      });
    }

    // 2. Brand audit (website + socials + reputation) and ROI projection
    const audit = await buildBrandAudit({ ...prospect, ...scraped });
    await updateProspect(id, { ...audit });

    // 3. Pitch script: flaws + cost + projected return
    const script = await generatePitchScript({
      business_name: prospect.business_name,
      city: prospect.city,
      google_rating: scraped.google_rating,
      review_count: scraped.review_count,
      unanswered_reviews: scraped.unanswered_reviews,
      competitor_name: scraped.competitor_name,
      competitor_reviews: scraped.competitor_reviews,
      audit: audit.audit_report,
      roi: audit.roi_projection,
    });
    await updateProspect(id, { pitch_script: script });

    // 4. Voiceover (optional — the player narrates in-browser otherwise)
    await setProspectStatus(id, "rendering");
    emit({ id, status: "rendering" });
    const { voiceover_url } = await generateVoiceover(script, prospect.business_name);
    await updateProspect(id, { voiceover_url });

    // 5. Render video / poster
    const next = (await getProspectById(id))!;
    const rendered = await renderPitchVideo(next);
    await setProspectStatus(id, "ready", rendered);

    // 6. Enroll in the campaign the moment the audit completes: welcome
    // email goes out immediately, pitch fires 1h later. Idempotent —
    // welcomeProspect skips leads that were already welcomed at import.
    try {
      const { welcomeProspect } = await import("@/lib/crm-actions");
      const finalized = (await getProspectById(id))!;
      await welcomeProspect(finalized);
    } catch (err) {
      console.warn("[queue] welcome email failed for", prospect.business_name, err);
    }

    emit({ id, status: "ready" });
    return { id, status: "ready" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setProspectStatus(id, "failed", { error: message });
    emit({ id, status: "failed", error: message });
    return { id, status: "failed", error: message };
  }
}