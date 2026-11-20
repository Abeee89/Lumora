import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse } from "@/kernel/http";
import * as topics from "@/modules/topics/public";
import { container } from "@/server/container";
import { enforceUserRate, ifMatchVersion, requireIdentity } from "@/server/request-context";

/**
 * TOP-07 POST /api/app/topics/{topicId}/archive (FR-018, EC-008). Sessions keep their link;
 * the published `TopicArchived` is what drops the topic from the exam readiness
 * denominator. An already archived topic answers 200 and no event.
 */
export async function POST(
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

    const now = new Date();
    const { topic, changed } = await topics.archiveTopic(
      c.database,
      identity.userId,
      topicId,
      ifMatchVersion(request),
      now,
    );

    if (changed) {
      await topics.publishTopicEvent({
        type: "TopicArchived",
        topicId: topic.id,
        subjectId: topic.subjectId,
        userId: identity.userId,
        occurredAt: now.toISOString(),
      });
    }

    return jsonResponse(200, topic, requestId, { etag: `"${topic.version}"` });
  });
}
