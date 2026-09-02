import { onLeadArrival } from "@/lib/crm/live-hub";
import { apiBaseUrl, getToken } from "@/lib/crm/session";

/**
 * The panel's live wire.
 *
 * The back office used to learn about a new lead by asking every fifteen
 * seconds, and that is the wrong shape for a notification. Fifteen seconds is
 * already long enough to notice, but the real problem was the hidden tab: a
 * browser clamps `setInterval` in a background tab to roughly once a minute and
 * may freeze one that has been hidden for several, so the count in the title —
 * which exists precisely for the window you are *not* looking at — was the
 * thing arriving late. Server-sent events are not on that budget. The message
 * is delivered when the server has something to say.
 *
 * Two things can make this stream speak:
 *
 *  - `onLeadArrival`, published by `forwardToCrm` the instant a submission goes
 *    through this server. Nothing is polled on this path at all; the visitor
 *    presses "Envoyer" and the tab title moves.
 *  - a sweep of `/v1/changes`, for everything else — a lead created straight
 *    against the API, another instance of this site, or the other administrator
 *    opening a file and clearing its unseen mark. Server-side, so no browser
 *    throttles it, and cheap: three aggregates over one table.
 *
 * The stream carries no lead data, only "something moved". The panel already
 * knows how to reload itself through the authenticated proxy, and keeping the
 * payload empty means this endpoint never becomes a second, subtly different
 * copy of the list.
 */

export const dynamic = "force-dynamic";

/** The safety net, for arrivals that did not pass through this server. */
const SWEEP_MS = 5_000;

/*
 * A comment down the wire often enough that nothing in the middle decides the
 * connection is idle and closes it. Proxies commonly give up after 60s.
 */
const HEARTBEAT_MS = 25_000;

/** The same fingerprint the panel compares, built server-side. */
async function fetchSignature(token: string): Promise<string | null> {
  try {
    const response = await fetch(`${apiBaseUrl()}/v1/changes`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const { data } = (await response.json()) as {
      data: {
        count: number;
        unseen: number;
        latestId: number | null;
        updatedAt: string | null;
      };
    };

    return `${data.count}:${data.unseen}:${data.latestId ?? "-"}:${data.updatedAt ?? "-"}`;
  } catch {
    /* The API being briefly unreachable is not worth tearing the stream down
       for — the next sweep retries, and the panel's own fallback poll is still
       running underneath. */
    return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  const token = await getToken();

  if (!token) {
    return Response.json({ message: "Session expirée." }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      let signature = await fetchSignature(token);

      const send = (frame: string) => {
        if (!open) return;

        try {
          controller.enqueue(encoder.encode(frame));
        } catch {
          /* The client hung up between the abort firing and this write. */
          open = false;
        }
      };

      /*
       * The event carries the fingerprint the server has just read.
       *
       * Without it the panel has to ask "did something change?" before it can
       * act on being told that something changed — and since reloading the list
       * takes its own fingerprint first, an arrival cost three round trips
       * before anything reached the screen. Sending the value the server
       * already has in hand leaves exactly one: fetch the list.
       *
       * `null` means the server could not read it. The panel then reloads
       * unconditionally rather than risk sitting on a stale list.
       */
      const emit = (value: string | null) =>
        send(`event: leads\ndata: ${JSON.stringify({ signature: value })}\n\n`);

      /*
       * A submission just came through this server.
       *
       * The fingerprint is read here rather than left to the panel: this side
       * has the fast local link to the API, and taking it now also moves the
       * sweep's baseline forward, so the next sweep does not announce the same
       * arrival a second time.
       */
      const stopListening = onLeadArrival(() => {
        void (async () => {
          const next = await fetchSignature(token);

          if (next === null) {
            emit(null);
            return;
          }

          signature = next;
          emit(next);
        })();
      });

      const sweep = setInterval(async () => {
        if (!open) return;

        const next = await fetchSignature(token);

        /* A failed sweep leaves the last known good fingerprint in place, so
           the API coming back does not read as a change and force every open
           panel to reload the list for nothing. */
        if (next === null || next === signature) return;

        signature = next;
        emit(next);
      }, SWEEP_MS);

      const heartbeat = setInterval(() => send(": keep-alive\n\n"), HEARTBEAT_MS);

      const close = () => {
        if (!open) return;

        open = false;
        stopListening();
        clearInterval(sweep);
        clearInterval(heartbeat);

        try {
          controller.close();
        } catch {
          /* Already closed from the other end. */
        }
      };

      request.signal.addEventListener("abort", close);

      /* Reconnect briskly: this is same-origin and cheap, and the gap is time
         the panel spends back on its slow fallback poll. */
      send("retry: 3000\n\n");

      /* Says the wire is live, which is the panel's cue to back its own polling
         off. Sent last so a client that receives it knows the sweep and the
         listener are both already in place. */
      send("event: ready\ndata: {}\n\n");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      /* nginx buffers a proxied response by default, which would hold every
         event back until the buffer filled — exactly the delay this endpoint
         exists to remove. Harmless anywhere that is not behind nginx. */
      "X-Accel-Buffering": "no",
    },
  });
}
