import { AppError } from "@/kernel/errors";
import { handleRoute, jsonResponse } from "@/kernel/http";
import { localDateOf } from "@/kernel/time";
import * as goals from "@/modules/goals/public";
import { getUserClockContext } from "@/modules/profile/public";
import { container } from "@/server/container";
import { enforceUserRate, goalProgressQuery, requireIdentity } from "@/server/request-context";

/**
 * GOAL-05 GET /api/app/goals/progress (FR-072, FR-073): minutes against the target in force
 * on one local day, overall and per non-archived subject with a goal. `date` defaults to
 * today in the profile zone; the figure includes a running timer's elapsed minutes, so the
 * client refreshes it after every timer state change (AC-FR-072-2).
 */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const parsed = goalProgressQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) {
      throw new AppError("validation_failed", {
        details: {
          fields: parsed.error.issues.map((issue) => ({
            path: issue.path.join(".") || "query",
            rule: issue.code,
          })),
        },
      });
    }

    const clock = await getUserClockContext(c.database, identity.userId);
    const now = new Date();
    const date = parsed.data.date ?? localDateOf(now, clock.timezone, clock.rolloverHour);
    const progress = await goals.getGoalProgress(
      c.database,
      identity.userId,
      date,
      { now, ...clock },
    );
    return jsonResponse(200, progress, requestId);
  });
}
