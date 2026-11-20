import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import * as topics from "@/modules/topics/public";
import { container } from "@/server/container";
import { enforceUserRate, requireIdentity, topicOrderSchema } from "@/server/request-context";

/** TOP-06 PUT /api/app/subjects/{subjectId}/topics/order (FR-016, NFR-042). */
export async function PUT(
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

    const input = await readJson(request, topicOrderSchema);
    const data = await topics.reorderTopics(
      c.database,
      identity.userId,
      subjectId,
      input.topicIds,
      new Date(),
    );
    return jsonResponse(200, { data }, requestId);
  });
}
