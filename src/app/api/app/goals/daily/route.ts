import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import * as goals from "@/modules/goals/public";
import { getUserClockContext } from "@/modules/profile/public";
import { container } from "@/server/container";
import { enforceUserRate, requireIdentity, setDailyGoalSchema } from "@/server/request-context";

/**
 * GOAL-02 PUT /api/app/goals/daily (FR-070, FR-074): set the overall target from the current
 * local day forward. No `If-Match` and no `Idempotency-Key`: the set is idempotent and the
 * last write wins (API-ENDPOINTS GOAL-02).
 */
export async function PUT(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const input = await readJson(request, setDailyGoalSchema);
    const clock = await getUserClockContext(c.database, identity.userId);
    const context = { now: new Date(), ...clock };
    const goal = await goals.setDailyGoal(
      c.database,
      identity.userId,
      input.targetMinutes,
      context,
    );
    return jsonResponse(200, goal, requestId);
  });
}
