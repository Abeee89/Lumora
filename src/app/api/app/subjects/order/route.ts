import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import * as subjects from "@/modules/subjects/public";
import { container } from "@/server/container";
import { enforceUserRate, requireIdentity, subjectOrderSchema } from "@/server/request-context";

/**
 * SUBJ-05 PUT /api/app/subjects/order (FR-012). The full-set check replaces `If-Match`, so
 * a client holding a stale list is rejected and reloads (AC-FR-012-3).
 */
export async function PUT(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const input = await readJson(request, subjectOrderSchema);
    const data = await subjects.reorderSubjects(
      c.database,
      identity.userId,
      input.subjectIds,
      new Date(),
    );
    return jsonResponse(200, { data }, requestId);
  });
}
