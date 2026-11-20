import * as auth from "@/modules/auth/public";
import { assertSameOrigin, handleRoute, noContentResponse } from "@/kernel/http";
import { container } from "@/server/container";
import {
  clearedSessionCookie,
  requestContext,
  requireIdentity,
} from "@/server/request-context";

/** AUTH-04 POST /api/app/auth/sign-out (FR-004). Revokes the current sign-in only. */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await auth.signOut(c.database, c.authDeps, identity, requestContext(request, c));

    return noContentResponse(requestId, { "set-cookie": clearedSessionCookie(c) });
  });
}