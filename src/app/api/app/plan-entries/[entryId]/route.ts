import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, noContentResponse, readJson } from "@/kernel/http";
import * as plans from "@/modules/plans/public";
import * as profile from "@/modules/profile/public";
import { container } from "@/server/container";
import {
  enforceUserRate,
  ifMatchVersion,
  requireIdentity,
  updatePlanEntrySchema,
} from "@/server/request-context";

async function entryIdOf(context: { params: Promise<{ entryId: string }> }): Promise<string> {
  const { entryId } = await context.params;
  if (!isUuid(entryId)) throw new AppError("not_found");
  return entryId;
}

/** PLAN-03 GET /api/app/plan-entries/{entryId} (FR-036). */
export async function GET(
  request: Request,
  context: { params: Promise<{ entryId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const entry = await plans.getPlanEntry(c.database, identity.userId, await entryIdOf(context));
    return jsonResponse(200, entry, requestId, { etag: `"${entry.version}"` });
  });
}

/** PLAN-04 PATCH /api/app/plan-entries/{entryId} (FR-031). `If-Match` is required (ADR-011). */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ entryId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const entryId = await entryIdOf(context);
    const input = await readJson(request, updatePlanEntrySchema);
    // An explicit `topicId: null` drops the topic, so presence decides, not truthiness.
    const patch: plans.UpdatePlanEntryInput = {};
    if (input.subjectId !== undefined) patch.subjectId = input.subjectId;
    if (input.topicId !== undefined) patch.topicId = input.topicId;
    if (input.startsAt !== undefined) patch.startsAt = input.startsAt;
    if (input.durationMin !== undefined) patch.durationMin = input.durationMin;
    if (input.confirmedWarnings !== undefined) patch.confirmedWarnings = input.confirmedWarnings;

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const edited = await plans.editPlanEntry(
      c.database,
      identity.userId,
      entryId,
      ifMatchVersion(request),
      patch,
      { now: new Date(), timezone: clock.timezone, rolloverHour: clock.rolloverHour },
    );
    return jsonResponse(200, { ...edited.entry, warnings: edited.warnings }, requestId, {
      etag: `"${edited.entry.version}"`,
    });
  });
}

/** PLAN-05 DELETE /api/app/plan-entries/{entryId} (FR-032). A retry after success is 404. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ entryId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    await plans.deletePlanEntry(
      c.database,
      identity.userId,
      await entryIdOf(context),
      ifMatchVersion(request),
    );
    return noContentResponse(requestId);
  });
}