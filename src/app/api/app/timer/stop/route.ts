import { assertSameOrigin, handleRoute, jsonResponse } from "@/kernel/http";
import { runIdempotent } from "@/kernel/idempotency";
import * as profile from "@/modules/profile/public";
import * as timer from "@/modules/timer/public";
import { container } from "@/server/container";
import {
  enforceUserRate,
  ifMatchVersion,
  requiredIdempotencyKey,
  requireIdentity,
} from "@/server/request-context";

/**
 * TIM-05 POST /api/app/timer/stop (FR-040, FR-045, FR-058): measure the study time from the
 * run's focus segments, classify it (BR-007, BR-008) and report what happened. The key is
 * stored on the session (FR-048), so a double click returns one result and one session.
 */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "timer");

    const key = requiredIdempotencyKey(request);
    const expectedVersion = ifMatchVersion(request);
    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const context: timer.TimerContext = {
      now: new Date(),
      timezone: clock.timezone,
      rolloverHour: clock.rolloverHour,
    };

    const result = await runIdempotent({
      database: c.database,
      store: c.idempotency,
      userId: identity.userId,
      scope: "timer.stop",
      key,
      payload: { method: "POST", path: "/api/app/timer/stop", body: {} },
      run: async (tx) => {
        const stopped = await timer.stopTimer(tx, identity.userId, expectedVersion, context, key);
        return { status: 200, body: stopped };
      },
    });

    const headers: Record<string, string> = {};
    if (result.replayed) headers["idempotent-replay"] = "true";
    return jsonResponse(result.status, result.body, requestId, headers);
  });
}
