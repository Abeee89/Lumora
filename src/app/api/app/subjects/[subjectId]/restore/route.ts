import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse } from "@/kernel/http";
import * as subjects from "@/modules/subjects/public";
import { container } from "@/server/container";
import { enforceUserRate, ifMatchVersion, requireIdentity } from "@/server/request-context";

/**
 * SUBJ-07 POST /api/app/subjects/{subjectId}/restore (FR-014). A name already taken by an
 * active subject answers `name_conflict` and nothing changes (AC-FR-014-3).
 */
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

    const subject = await subjects.restoreSubject(
      c.database,
      identity.userId,
      subjectId,
      ifMatchVersion(request),
      new Date(),
    );
    return jsonResponse(200, subject, requestId, { etag: `"${subject.version}"` });
  });
}
