import * as auth from "@/modules/auth/public";
import { assertSameOrigin, handleRoute, noContentResponse } from "@/kernel/http";
import { AppError } from "@/kernel/errors";
import { isUuid } from "@/kernel/crypto";
import { container } from "@/server/container";
import { requestContext, requireIdentity } from "@/server/request-context";

/** AUTH-08 DELETE /api/app/auth/sign-ins/{signInId} (FR-008). */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ signInId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    const { signInId } = await context.params;

    // A malformed path id is 404, not 400 (API-SECURITY section 5).
    if (!isUuid(signInId)) throw new AppError("not_found");

    await auth.revokeSignIn(c.database, c.authDeps, identity, signInId, requestContext(request, c));
    return noContentResponse(requestId);
  });
}