import { AppError } from "@/kernel/errors";
import { handleRoute, jsonResponse } from "@/kernel/http";
import { isRealLocalDate } from "@/kernel/time";
import * as calendar from "@/modules/calendar/public";
import { getUserClockContext } from "@/modules/profile/public";
import { container } from "@/server/container";
import { enforceUserRate, requireIdentity } from "@/server/request-context";

/**
 * CAL-02 GET /api/app/calendar/days/{date} (FR-061, FR-062): one day's sessions with the
 * day's own allocation, the day total, and the visible plan entries with derived status.
 * A malformed `date` is `validation_failed` (OD-M49 precedent).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ date: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "heavy");

    const { date } = await context.params;
    if (!isRealLocalDate(date)) {
      throw new AppError("validation_failed", {
        details: { fields: [{ path: "date", rule: "date" }] },
      });
    }

    const clock = await getUserClockContext(c.database, identity.userId);
    const detail = await calendar.getDayDetail(c.database, identity.userId, date, {
      now: new Date(),
      ...clock,
    });
    return jsonResponse(200, detail, requestId);
  });
}