import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { runIdempotent } from "@/kernel/idempotency";
import * as topics from "@/modules/topics/public";
import { container } from "@/server/container";
import {
  bulkTopicsSchema,
  enforceUserRate,
  requiredIdempotencyKey,
  requireIdentity,
} from "@/server/request-context";

/**
 * TOP-03 POST /api/app/subjects/{subjectId}/topics/bulk (FR-017). A dry run answers the
 * preview and stores nothing, so it needs no `Idempotency-Key`; the save is atomic and
 * keyed (scope `topic.bulk_create`).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ subjectId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "heavy");

    const { subjectId } = await context.params;
    if (!isUuid(subjectId)) throw new AppError("not_found");

    const input = await readJson(request, bulkTopicsSchema);
    if (input.dryRun === true) {
      const preview = await topics.previewBulkTopics(
        c.database,
        identity.userId,
        subjectId,
        input.lines,
      );
      return jsonResponse(200, preview, requestId);
    }

    const key = requiredIdempotencyKey(request);
    const now = new Date();
    const result = await runIdempotent({
      database: c.database,
      store: c.idempotency,
      userId: identity.userId,
      scope: "topic.bulk_create",
      key,
      payload: { method: "POST", path: `/api/app/subjects/${subjectId}/topics/bulk`, body: input },
      run: async (tx) => ({
        status: 201,
        body: { data: await topics.bulkCreateTopics(tx, identity.userId, subjectId, input.lines, now) },
      }),
    });

    const headers: Record<string, string> = {
      location: `/api/app/subjects/${subjectId}/topics`,
    };
    if (result.replayed) headers["idempotent-replay"] = "true";
    return jsonResponse(result.status, result.body, requestId, headers);
  });
}
