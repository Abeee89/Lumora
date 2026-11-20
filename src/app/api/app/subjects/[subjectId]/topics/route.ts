import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { runIdempotent } from "@/kernel/idempotency";
import * as topics from "@/modules/topics/public";
import { container } from "@/server/container";
import {
  createTopicSchema,
  enforceUserRate,
  includeArchivedQuery,
  requiredIdempotencyKey,
  requireIdentity,
} from "@/server/request-context";

/** TOP-01 GET /api/app/subjects/{subjectId}/topics (FR-015). */
export async function GET(
  request: Request,
  context: { params: Promise<{ subjectId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const { subjectId } = await context.params;
    if (!isUuid(subjectId)) throw new AppError("not_found");

    const includeArchived = includeArchivedQuery(new URL(request.url));
    const data = await topics.listTopics(c.database, identity.userId, subjectId, includeArchived);
    return jsonResponse(200, { data }, requestId);
  });
}

/** TOP-02 POST /api/app/subjects/{subjectId}/topics (FR-015, BR-024, BR-029). */
export async function POST(
  request: Request,
  context: { params: Promise<{ subjectId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const { subjectId } = await context.params;
    if (!isUuid(subjectId)) throw new AppError("not_found");

    const key = requiredIdempotencyKey(request);
    const input = await readJson(request, createTopicSchema);
    const now = new Date();

    const result = await runIdempotent({
      database: c.database,
      store: c.idempotency,
      userId: identity.userId,
      scope: "topic.create",
      key,
      payload: { method: "POST", path: `/api/app/subjects/${subjectId}/topics`, body: input },
      run: async (tx) => ({
        status: 201,
        body: await topics.createTopic(tx, identity.userId, subjectId, input, now),
      }),
    });

    const headers: Record<string, string> = {
      etag: `"${result.body.version}"`,
      location: `/api/app/topics/${result.body.id}`,
    };
    if (result.replayed) headers["idempotent-replay"] = "true";
    return jsonResponse(result.status, result.body, requestId, headers);
  });
}
