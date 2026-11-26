import { AppError } from "@/kernel/errors";
import { handleRoute, jsonResponse } from "@/kernel/http";
import * as calendar from "@/modules/calendar/public";
import { getUserClockContext } from "@/modules/profile/public";
import { container } from "@/server/container";
import { enforceUserRate, monthQuerySchema, requireIdentity } from "@/server/request-context";

/**
 * CAL-01 GET /api/app/calendar/heatmap (FR-060): study minutes and intensity bucket for
 * every day of the requested month. `month` is required `YYYY-MM` in the profile zone;
 * malformed is `validation_failed`. Minutes stay in the response so the UI never depends
 * on color alone (AC-FR-060-2, NFR-043).
 */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "heavy");

    const parsed = monthQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
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
    const heatmap = await calendar.getMonthHeatmap(
      c.database,
      identity.userId,
      parsed.data.month,
      { now: new Date(), ...clock },
    );
    return jsonResponse(200, heatmap, requestId);
  });
}