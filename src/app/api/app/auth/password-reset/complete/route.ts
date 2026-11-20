import * as auth from "@/modules/auth/public";
import { assertSameOrigin, handleRoute, noContentResponse, readJson } from "@/kernel/http";
import { container } from "@/server/container";
import {
  passwordResetCompleteSchema,
  requestContext,
} from "@/server/request-context";

/** AUTH-06 POST /api/app/auth/password-reset/complete (FR-005). */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const input = await readJson(request, passwordResetCompleteSchema);

    await c.database.transaction(async (tx) =>
      auth.completePasswordReset(tx, c.authDeps, input, requestContext(request, c)),
    );

    return noContentResponse(requestId);
  });
}