import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { runIdempotent } from "@/kernel/idempotency";
import { localDateOf } from "@/kernel/time";
import * as exams from "@/modules/exams/public";
import * as profile from "@/modules/profile/public";
import { container } from "@/server/container";
import {
  createExamSchema,
  enforceUserRate,
  examListQuery,
  requiredIdempotencyKey,
  requireIdentity,
} from "@/server/request-context";

/** EXAM-01 GET /api/app/exams (FR-120). Upcoming is unpaginated; archived is cursor-paginated. */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const parsed = examListQuery.safeParse(
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
    const today = localDateOf(new Date(), clock.timezone, clock.rolloverHour);
    const page =
      parsed.data.state === "archived"
        ? {
            ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
            ...(parsed.data.cursor !== undefined ? { cursor: parsed.data.cursor } : {}),
          }
        : null;
    const list = await exams.listExams(c.database, identity.userId, parsed.data.state, page, today);
    return jsonResponse(
      200,
      { data: list.data, page: { nextCursor: list.nextCursor, hasMore: list.hasMore } },
      requestId,
    );
  });
}


/** EXAM-02 POST /api/app/exams (FR-121). The date is checked against the user's local today. */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const key = requiredIdempotencyKey(request);
    const input = await readJson(request, createExamSchema);
    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const today = localDateOf(new Date(), clock.timezone, clock.rolloverHour);

    const result = await runIdempotent({
      database: c.database,
      store: c.idempotency,
      userId: identity.userId,
      scope: "exam.create",
      key,
      payload: { method: "POST", path: "/api/app/exams", body: input },
      run: async (tx) => ({
        status: 201,
        body: await exams.createExam(tx, identity.userId, input, today),
      }),
    });

    const headers: Record<string, string> = {
      etag: `"${result.body.version}"`,
      location: `/api/app/exams/${result.body.id}`,
    };
    if (result.replayed) headers["idempotent-replay"] = "true";
    return jsonResponse(result.status, result.body, requestId, headers);
  });
}