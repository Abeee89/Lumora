import { handleRoute, jsonResponse } from "@/kernel/http";
import * as timer from "@/modules/timer/public";
import { container } from "@/server/container";
import { enforceUserRate, requireIdentity } from "@/server/request-context";

/**
 * TIM-01 GET /api/app/timer (FR-054, FR-059): the caller's run, or `null`, with the server
 * clock the client computes elapsed time from. Read only: a run past its idle deadline reads
 * as absent and the idle job persists the auto-closed session on its next pass (BR-006).
 */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "timer");

    const now = new Date();
    const state = await timer.getTimerState(c.database, identity.userId, now);
    // The run id and version make the tag: a new run never matches an old tag, and
    // `serverTime` stays out of it, or every poll of a running timer would be a miss.
    const etag = state === null ? '"timer:none"' : `"${state.id}.${state.version}"`;
    const headers = { etag, "cache-control": "private, no-cache" };
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: { ...headers, "x-request-id": requestId },
      });
    }
    return jsonResponse(200, { timer: state, serverTime: now.toISOString() }, requestId, headers);
  });
}
