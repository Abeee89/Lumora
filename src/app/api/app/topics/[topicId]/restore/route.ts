import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse } from "@/kernel/http";
import * as topics from "@/modules/topics/public";
import { container } from "@/server/container";
import { enforceUserRate, ifMatchVersion, requireIdentity } from "@/server/request-context";

/**
 * TOP-08 POST /api/app/topics/{topicId}/restore (FR-018). Weight and status come back as
 * they were; the topic lands last among the active ones.
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

    const { topic } = await topics.restoreTopic(
      c.database,
      identity.userId,
      topicId,
      ifMatchVersion(request),
      new Date(),
    );
    return jsonResponse(200, topic, requestId, { etag: `"${topic.version}"` });
  });
}
