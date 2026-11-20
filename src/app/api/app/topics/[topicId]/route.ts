import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import * as topics from "@/modules/topics/public";
import { container } from "@/server/container";
import {
  enforceUserRate,
  ifMatchVersion,
  requireIdentity,
  updateTopicSchema,
} from "@/server/request-context";

/** TOP-04 GET /api/app/topics/{topicId} (FR-015). Archived topics stay readable (EC-008). */
export async function GET(
  request: Request,
  context: { params: Promise<{ topicId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const { topicId } = await context.params;
    if (!isUuid(topicId)) throw new AppError("not_found");

    const topic = await topics.getTopic(c.database, identity.userId, topicId);
    return jsonResponse(200, topic, requestId, { etag: `"${topic.version}"` });
  });
}

/**
 * TOP-05 PATCH /api/app/topics/{topicId} (FR-016, FR-019). A status change publishes
 * `TopicStatusChanged` after the update commits, so a subscriber never reads stale state.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ topicId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const { topicId } = await context.params;
    if (!isUuid(topicId)) throw new AppError("not_found");

    const input = await readJson(request, updateTopicSchema);
    const patch: topics.TopicPatch = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.weight !== undefined) patch.weight = input.weight;
    if (input.status !== undefined) patch.status = input.status;

    const now = new Date();
    const { topic, statusChange } = await topics.editTopic(
      c.database,
      identity.userId,
      topicId,
      ifMatchVersion(request),
      patch,
      now,
    );

    if (statusChange !== null) {
      await topics.publishTopicEvent({
        type: "TopicStatusChanged",
        topicId: topic.id,
        subjectId: topic.subjectId,
        userId: identity.userId,
        occurredAt: now.toISOString(),
        previousStatus: statusChange.previousStatus,
        status: statusChange.status,
      });
    }

    return jsonResponse(200, topic, requestId, { etag: `"${topic.version}"` });
  });
}
