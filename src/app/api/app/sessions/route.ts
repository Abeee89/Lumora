import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { runIdempotent } from "@/kernel/idempotency";
import * as sessions from "@/modules/sessions/public";
import * as profile from "@/modules/profile/public";
import { container } from "@/server/container";
import {
  createSessionSchema,
  enforceUserRate,
  requiredIdempotencyKey,
  requireIdentity,
  sessionListQuery,
} from "@/server/request-context";

/** SESS-01 GET /api/app/sessions (FR-061): newest first, cursor paginated. */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const parsed = sessionListQuery.safeParse(
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

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const query: sessions.SessionListQuery = {
      ...(parsed.data.from !== undefined ? { from: parsed.data.from } : {}),
      ...(parsed.data.to !== undefined ? { to: parsed.data.to } : {}),
      ...(parsed.data.subjectId !== undefined ? { subjectId: parsed.data.subjectId } : {}),
      ...(parsed.data.topicId !== undefined ? { topicId: parsed.data.topicId } : {}),
      ...(parsed.data.source !== undefined ? { source: parsed.data.source } : {}),
      ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
      ...(parsed.data.cursor !== undefined ? { cursor: parsed.data.cursor } : {}),
    };
    const page = await sessions.listSessions(c.database, identity.userId, query, {
      now: new Date(),
      timezone: clock.timezone,
      rolloverHour: clock.rolloverHour,
    });
    return jsonResponse(
      200,
      { data: page.data, page: { nextCursor: page.nextCursor, hasMore: page.hasMore } },
      requestId,
    );
  });
}

/** SESS-03 POST /api/app/sessions (FR-042, FR-048): idempotent by `Idempotency-Key`. */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const key = requiredIdempotencyKey(request);
    const input = await readJson(request, createSessionSchema);
    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const body: sessions.CreateSessionInput = {
      subjectId: input.subjectId,
      topicId: input.topicId ?? null,
      planEntryId: input.planEntryId ?? null,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
    };

    const result = await runIdempotent({
      database: c.database,
      store: c.idempotency,
      userId: identity.userId,
      scope: "session.create",
      key,
      payload: { method: "POST", path: "/api/app/sessions", body: input },
      run: async (tx) => {
        const created = await sessions.createManualSession(
          tx,
          identity.userId,
          body,
          { now: new Date(), timezone: clock.timezone, rolloverHour: clock.rolloverHour },
          key,
        );
        return { status: 201, body: created.session };
      },
    });

    const headers: Record<string, string> = {
      etag: `"${result.body.version}"`,
      location: `/api/app/sessions/${result.body.id}`,
    };
    if (result.replayed) headers["idempotent-replay"] = "true";
    return jsonResponse(result.status, result.body, requestId, headers);
  });
}
