import { scrapeReputation } from "@/lib/services/scraper";
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
      });
    }
    this.processing = false;
  }

  private async process(id: string): Promise<void> {
    const prospect = await getProspectById(id);
    if (!prospect) return;

    try {
      // 1. Scrape reputation
      await setProspectStatus(id, "scraping");
      this.emit({ id, status: "scraping" });
      const scraped = await scrapeReputation({
        business_name: prospect.business_name,
        city: prospect.city ?? "",
        website: prospect.website,
      });
      await updateProspect(id, { ...scraped });

      // 2. Write audit summary + generate pitch script
      const script = await generatePitchScript({
        business_name: prospect.business_name,
        city: prospect.city,
        google_rating: scraped.google_rating,
        review_count: scraped.review_count,
        unanswered_reviews: scraped.unanswered_reviews,
        competitor_name: scraped.competitor_name,
        competitor_reviews: scraped.competitor_reviews,
      });
      await updateProspect(id, { pitch_script: script });

      // 3. Voiceover
      await setProspectStatus(id, "rendering");
      this.emit({ id, status: "rendering" });
      const { voiceover_url } = await generateVoiceover(
        script,
        prospect.business_name,
      );
      await updateProspect(id, { voiceover_url });

      // 4. Render video + thumbnails
      const next = (await getProspectById(id))!;
      const rendered = await renderPitchVideo(next);
      await setProspectStatus(id, "ready", rendered);

      this.emit({ id, status: "ready" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await setProspectStatus(id, "failed", { error: message });
      this.emit({ id, status: "failed", error: message });
    }
  }
}

export const batchQueue = new BatchQueue();