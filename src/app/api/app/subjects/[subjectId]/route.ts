import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import * as subjects from "@/modules/subjects/public";
import { container } from "@/server/container";
import {
  enforceUserRate,
  ifMatchVersion,
  requireIdentity,
  updateSubjectSchema,
} from "@/server/request-context";

/** SUBJ-03 GET /api/app/subjects/{subjectId} (FR-010). */
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

    const subject = await subjects.getSubject(c.database, identity.userId, subjectId);
    return jsonResponse(200, subject, requestId, { etag: `"${subject.version}"` });
  });
}

/** SUBJ-04 PATCH /api/app/subjects/{subjectId} (FR-011). `If-Match` is required (ADR-011). */
export async function PATCH(
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

    const input = await readJson(request, updateSubjectSchema);
    const patch: subjects.SubjectPatch = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.color !== undefined) patch.color = input.color;

    const subject = await subjects.editSubject(
      c.database,
      identity.userId,
      subjectId,
      ifMatchVersion(request),
      patch,
      new Date(),
    );
    return jsonResponse(200, subject, requestId, { etag: `"${subject.version}"` });
  });
}
