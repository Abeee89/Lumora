import * as auth from "@/modules/auth/public";
import * as profile from "@/modules/profile/public";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { container } from "@/server/container";
import {
  requestContext,
  sessionCookieFor,
  sessionMaxAgeSeconds,
  signInSchema,
} from "@/server/request-context";

/** AUTH-02 POST /api/app/auth/sign-in (FR-002). */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const input = await readJson(request, signInSchema);
    const context = requestContext(request, c);

    const result = await auth.signInWithPassword(c.database, c.authDeps, input, context);
    const view = await profile.getProfile(c.database, result.userId);

    return jsonResponse(200, view, requestId, {
      etag: `"${view.version}"`,
      "set-cookie": sessionCookieFor(c, result.session.rawToken, sessionMaxAgeSeconds),
    });
  });
}