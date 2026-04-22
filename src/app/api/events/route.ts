import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(`: connected\n\n`));
      const ka = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: keepalive\n\n`));
        } catch {
          /* ignore */
        }
      }, 25_000);
      const unsub = subscribe((data) => {
        try {
          controller.enqueue(enc.encode(data));
        } catch {
          /* ignore */
        }
      });
      const close = () => {
        clearInterval(ka);
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      // @ts-expect-error _close is a private signal hook
      controller._close = close;
    },
    cancel() {
      // controller is collected; subscribers prune themselves on errors
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
