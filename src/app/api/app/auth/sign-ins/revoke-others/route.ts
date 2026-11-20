import * as auth from "@/modules/auth/public";
import { assertSameOrigin, handleRoute, jsonResponse } from "@/kernel/http";
import { container } from "@/server/container";
import { requestContext, requireIdentity } from "@/server/request-context";

/** AUTH-09 POST /api/app/auth/sign-ins/revoke-others (FR-008). */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    const revoked = await auth.revokeOtherSignIns(
      c.database,
      c.authDeps,
      identity,
      requestContext(request, c),
    );
    return jsonResponse(200, { revoked }, requestId);
  });
}