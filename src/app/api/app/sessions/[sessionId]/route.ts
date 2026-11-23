import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, noContentResponse, readJson } from "@/kernel/http";
import * as sessions from "@/modules/sessions/public";
import * as profile from "@/modules/profile/public";
import { container } from "@/server/container";
import {
  enforceUserRate,
  ifMatchVersion,
  requireIdentity,
  updateSessionSchema,
} from "@/server/request-context";

async function sessionIdOf(context: { params: Promise<{ sessionId: string }> }): Promise<string> {
  const { sessionId } = await context.params;
  if (!isUuid(sessionId)) throw new AppError("not_found");
  return sessionId;
}

/** SESS-02 GET /api/app/sessions/{sessionId} (FR-061). */
export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const session = await sessions.getSession(c.database, identity.userId, await sessionIdOf(context));
    return jsonResponse(200, session, requestId, { etag: `"${session.version}"` });
  });
}

/** SESS-04 PATCH /api/app/sessions/{sessionId} (FR-043). `If-Match` is required (ADR-011). */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const sessionId = await sessionIdOf(context);
    const input = await readJson(request, updateSessionSchema);
    // An explicit `topicId: null` or `planEntryId: null` drops the link, so presence
    // decides, not truthiness.
    const patch: sessions.UpdateSessionInput = {};
    if (input.subjectId !== undefined) patch.subjectId = input.subjectId;
    if (input.topicId !== undefined) patch.topicId = input.topicId;
    if (input.planEntryId !== undefined) patch.planEntryId = input.planEntryId;
    if (input.startedAt !== undefined) patch.startedAt = input.startedAt;
    if (input.endedAt !== undefined) patch.endedAt = input.endedAt;

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const edited = await sessions.editSession(
      c.database,
      identity.userId,
      sessionId,
      ifMatchVersion(request),
      patch,
      { now: new Date(), timezone: clock.timezone, rolloverHour: clock.rolloverHour },
    );
    return jsonResponse(200, edited.session, requestId, { etag: `"${edited.session.version}"` });
  });
}

/** SESS-05 DELETE /api/app/sessions/{sessionId} (FR-044). A retry after success is 404. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    await sessions.deleteSession(
      c.database,
      identity.userId,
      await sessionIdOf(context),
      ifMatchVersion(request),
    );
    return noContentResponse(requestId);
  });
}
