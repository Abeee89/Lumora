import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { runIdempotent } from "@/kernel/idempotency";
import * as subjects from "@/modules/subjects/public";
import { container } from "@/server/container";
import {
  createSubjectSchema,
  enforceUserRate,
  includeArchivedQuery,
  requiredIdempotencyKey,
  requireIdentity,
} from "@/server/request-context";

/** SUBJ-01 GET /api/app/subjects (FR-010, FR-013). */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const includeArchived = includeArchivedQuery(new URL(request.url));
    const list = await subjects.listSubjects(c.database, identity.userId, includeArchived);
    return jsonResponse(200, { data: list }, requestId);
  });
}

/** SUBJ-02 POST /api/app/subjects (FR-010, FR-012). */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const key = requiredIdempotencyKey(request);
    const input = await readJson(request, createSubjectSchema);
    const now = new Date();

    const result = await runIdempotent({
      database: c.database,
      store: c.idempotency,
      userId: identity.userId,
      scope: "subject.create",
      key,
      payload: { method: "POST", path: "/api/app/subjects", body: input },
      run: async (tx) => ({
        status: 201,
        body: await subjects.createSubject(tx, identity.userId, input, now),
      }),
    });

    const headers: Record<string, string> = {
      etag: `"${result.body.version}"`,
      location: `/api/app/subjects/${result.body.id}`,
    };
    if (result.replayed) headers["idempotent-replay"] = "true";
    return jsonResponse(result.status, result.body, requestId, headers);
  });
}
