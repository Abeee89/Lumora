import { assertSameOrigin, handleRoute, jsonResponse } from "@/kernel/http";
import * as profile from "@/modules/profile/public";
import * as timer from "@/modules/timer/public";
import { container } from "@/server/container";
import { enforceUserRate, ifMatchVersion, requireIdentity } from "@/server/request-context";

/**
 * TIM-03 POST /api/app/timer/pause (FR-052): stop the clock and close the open focus
 * interval at server time. `If-Match` carries the run version (ADR-011, EC-020).
 */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "timer");

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const state = await c.database.transaction((tx) =>
      timer.pauseTimer(tx, identity.userId, ifMatchVersion(request), {
        now: new Date(),
        timezone: clock.timezone,
        rolloverHour: clock.rolloverHour,
      }),
    );
    return jsonResponse(200, state, requestId, { etag: `"${state.id}.${state.version}"` });
  });
}
