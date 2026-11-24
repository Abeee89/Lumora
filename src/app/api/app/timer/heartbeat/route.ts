import { assertSameOrigin, handleRoute, jsonResponse } from "@/kernel/http";
import * as profile from "@/modules/profile/public";
import * as timer from "@/modules/timer/public";
import { container } from "@/server/container";
import { enforceUserRate, requireIdentity } from "@/server/request-context";

/**
 * TIM-06 POST /api/app/timer/heartbeat (FR-046, BR-006): the client reports that the timer
 * is still watched. No `If-Match` and no key: the only effect is moving `lastHeartbeatAt`,
 * so repeats are harmless, and the server still decides closure after the idle window.
 */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "timer");

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const state = await c.database.transaction((tx) =>
      timer.heartbeatTimer(tx, identity.userId, {
        now: new Date(),
        timezone: clock.timezone,
        rolloverHour: clock.rolloverHour,
      }),
    );
    return jsonResponse(200, state, requestId, { etag: `"${state.id}.${state.version}"` });
  });
}
