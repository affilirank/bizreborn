#!/usr/bin/env node
/**
 * 5-Lead Live Batch — Staging Mode
 * Runs scrape -> site -> voice pipeline for 5 Florida leads.
 * Routes final email to STAGING_TO (meritmediamarketingfl@gmail.com) until flipped.
 */
import { buildPreviewForProspect } from "@/lib/ai-site-generator";
import { generateReceptionistAudio } from "@/lib/voice-receptionist-generator";
import { STAGING_RECIPIENT, STAGING_MODE } from "@/lib/staging-routing";

const LEADS = [
  { id: "batch-01", name: "Fort Pierce Roofing Pros", city: "Fort Pierce", category: "roofing" },
  { id: "batch-02", name: "Port St Lucie Landscaping", city: "Port St Lucie", category: "landscaping" },
  { id: "batch-03", name: "Melbourne Plumbing & Drain", city: "Melbourne", category: "plumbing" },
  { id: "batch-04", name: "Fort Pierce Fence & Deck", city: "Fort Pierce", category: "contractor" },
  { id: "batch-05", name: "Port St Lucie HVAC Services", city: "Port St Lucie", category: "hvac" },
];

async function runBatch() {
  console.log("=== 5-LEAD STAGING BATCH ===");
  console.log("Staging mode:", STAGING_MODE, "| Review inbox:", STAGING_RECIPIENT);
  console.log("Live /ai-site routes not deployable yet (build fixed but sandbox OOM); testing via direct source + mock audit.");

  for (const lead of LEADS) {
    console.log(`\n--- ${lead.id}: ${lead.name} (${lead.city}, FL) ---`);
    try {
      // Pipeline: site generator + voice
      const result = await buildPreviewForProspect(lead.id);
      if (result) {
        console.log("  Site preview URL:", result.url);
        console.log("  Payload keys:", result.payload ? Object.keys(result.payload) : "none");
        console.log("  Voice URL:", result.receptionist_audio_url || "pending TTS");
      } else {
        console.log("  buildPreviewForProspect returned null — check Supabase/admin client");
      }
      // Voice synthesis (separate call for audit)
      const voice = await generateReceptionistAudio(lead.id, lead.name, lead.city, lead.category);
      console.log("  Voice result:", voice ? { url: voice.receptionist_audio_url, scriptLength: voice.script?.length } : "failed / skipped");
    } catch (e: any) {
      console.log("  ERROR:", e.message || e);
    }
  }

  console.log("\n=== STAGING COMPLETE ===");
  console.log("Audit checklist before flipping to dispatch:");
  console.log("  1) Open /ai-site/batch-01 ... batch-05 on mobile (text wrapping, headline punch, reviews)");
  console.log("  2) Tap Play on each .mp3 (business name + city pronunciation natural?)");
  console.log("  3) Confirm no $49 references in rendered HTML / email");
  console.log("  4) Verify tracking pixel present; no sends to prospects (STAGING_TO = meritmediamarketingfl@gmail.com)");
  console.log("  5) Once 5/5 sharp: set STAGING_TO='' (empty), redeploy, activate auto-dispatch.");
}

runBatch();
