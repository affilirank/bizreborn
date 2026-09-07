import { getSupabase } from "@/lib/supabase";
import { createServiceClient } from "@/lib/supabase/admin";

export interface StoredFile {
  url: string;
  path: string;
}

const BUCKET = "leadgen";

/**
 * Media storage abstraction for the lead-generation pipeline.
 *
 * Uploads prefer the service-role client (bypasses RLS) so the admin back-office
 * can write the `leadgen` bucket regardless of bucket policies. Falls back to the
 * anon client, then to a local `./public/leadgen` directory so generated media
 * resolves during development / previews without Supabase.
 */
export async function uploadFile(
  key: string,
  data: ArrayBuffer | Buffer | string,
  contentType: string
): Promise<StoredFile> {
  const client = createServiceClient() ?? getSupabase();

  if (client) {
    const body = typeof data === "string" ? data : new Uint8Array(data);
    const { data: uploaded, error } = await client.storage
      .from(BUCKET)
      .upload(key, body, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    const { data: publicUrl } = client.storage.from(BUCKET).getPublicUrl(uploaded.path);
    return { url: publicUrl.publicUrl, path: uploaded.path };
  }

  const fs = await import("node:fs");
  const path = await import("node:path");
  const target = path.join(process.cwd(), "public", "leadgen", key);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const buf =
    typeof data === "string"
      ? Buffer.from(data)
      : Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data);
  fs.writeFileSync(target, buf);
  return { url: `/leadgen/${key}`, path: target };
}