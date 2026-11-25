import { handleRoute, jsonResponse } from "@/kernel/http";
import * as goals from "@/modules/goals/public";
import { getUserClockContext } from "@/modules/profile/public";
import { container } from "@/server/container";
import { enforceUserRate, requireIdentity } from "@/server/request-context";

/**
 * GOAL-01 GET /api/app/goals (FR-070, FR-071): the target in force today and every subject
 * target, including the suspended ones of archived subjects (AC-FR-071-4).
 */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const clock = await getUserClockContext(c.database, identity.userId);
    const set = await goals.getGoalSet(c.database, identity.userId, {
      now: new Date(),
      ...clock,
    });
    return jsonResponse(200, set, requestId);
  });
}
