import { NextResponse } from "next/server";
import { getProspectById, updateProspect, deleteProspect } from "@/lib/prospects";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { discoverEmailForBusiness } from "@/lib/services/scraper";
import { canReceiveEmail } from "@/lib/services/email-validate";
import { suppressEmails } from "@/lib/suppressions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Re-find & verify before delete.
 *
 * For each selected lead whose email failed: re-discover a published contact
 * email (website scrape → derived inbox → AI grounding → web search), gate it
 * through the MX reliability test, and swap it in when verified. Only leads
 * with NO verifiable email get removed — and their address is suppressed so
 * imports never re-add them.
 */
export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 10) : [];
  const deleteIfNotFound = body.deleteIfNotFound === true;
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids required (max 10 per call)" }, { status: 400 });
  }

  const recovered: Array<{ id: string; business_name: string; old_email: string | null; new_email: string }> = [];
  let pruned = 0;
  let suppressed = 0;
  let notFound = 0;

  for (const id of ids) {
    const p = await getProspectById(id);
    if (!p) continue;

    const refound = await discoverEmailForBusiness(
      {
        business_name: p.business_name,
        city: p.city ?? "",
        website: p.website,
        google_maps_link: p.google_maps_link,
      },
      { excludeEmails: p.email ? [p.email] : [] },
    );
    // Reliability test: the candidate must be well-formed AND its domain must
    // have live MX records before it replaces anything.
    const verified = refound && (await canReceiveEmail(refound)) ? refound : null;

    if (verified && verified !== (p.email ?? "")) {
      const now = new Date().toISOString();
      const logs = p.communication_logs ?? [];
      await updateProspect(id, {
        email: verified,
        communication_logs: [
          {
            date: now,
            type: "email_refound",
            notes: `Old email ${p.email ?? "—"} failed. Re-found & MX-verified ${verified} (source: ${p.website ?? "web search"}).`,
            admin: "Auto Recovery",
          },
          ...logs,
        ],
      });
      recovered.push({ id, business_name: p.business_name, old_email: p.email, new_email: verified });
    } else if (deleteIfNotFound) {
      if (await deleteProspect(id)) pruned++;
      if (p.email) {
        suppressed += await suppressEmails([p.email], "bad email: re-find failed before removal");
      }
    } else {
      notFound++;
    }
  }

  return NextResponse.json({ recovered, pruned, suppressed, notFound });
}
