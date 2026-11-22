import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse } from "@/kernel/http";
import * as plans from "@/modules/plans/public";
import * as profile from "@/modules/profile/public";
import { container } from "@/server/container";
import { enforceUserRate, ifMatchVersion, requireIdentity } from "@/server/request-context";

/** PLAN-06 POST /api/app/plan-entries/{entryId}/missed (FR-033). */
export async function POST(
  request: Request,
  context: { params: Promise<{ entryId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const { entryId } = await context.params;
    if (!isUuid(entryId)) throw new AppError("not_found");
    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const entry = await plans.markPlanEntryMissed(
      c.database,
      identity.userId,
      entryId,
      ifMatchVersion(request),
      { now: new Date(), timezone: clock.timezone, rolloverHour: clock.rolloverHour },
    );
    return jsonResponse(200, entry, requestId, { etag: `"${entry.version}"` });
  });
}