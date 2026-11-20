import * as auth from "@/modules/auth/public";
import * as profile from "@/modules/profile/public";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { container } from "@/server/container";
import {
  requestContext,
  sessionCookieFor,
  sessionMaxAgeSeconds,
  signUpSchema,
} from "@/server/request-context";

/** AUTH-01 POST /api/app/auth/sign-up (FR-001). */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const input = await readJson(request, signUpSchema);
    const context = requestContext(request, c);

    const registered = await c.database.transaction(async (tx) => {
      const created = await auth.registerWithPassword(tx, c.authDeps, input, context);
      await profile.ensureProfile(tx, {
        userId: created.userId,
        email: created.email,
        timezone: input.timezone,
      });
      return created;
    });

    const view = await profile.getProfile(c.database, registered.userId);

    return jsonResponse(201, view, requestId, {
      location: "/api/app/profile",
      etag: `"${view.version}"`,
      "set-cookie": sessionCookieFor(c, registered.session.rawToken, sessionMaxAgeSeconds),
    });
  });
}