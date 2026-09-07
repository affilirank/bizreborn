import { batchQueue } from "@/lib/services/queue";
import { isAdminOrDemo } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream for live batch progress.
 * Emits queue snapshots as prospects move through the pipeline.
 */
export async function GET() {
  if (!(await isAdminOrDemo())) {
    return new Response("Forbidden", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("snapshot", { queued: batchQueue.size() });

      const unsubscribe = batchQueue.subscribe((e) => {
        send("update", e);
      });

      const ping = setInterval(() => send("ping", { ts: Date.now() }), 15000);

      controller.enqueue(encoder.encode(": connected\n\n"));

      return () => {
        clearInterval(ping);
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}