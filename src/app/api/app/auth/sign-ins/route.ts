import * as auth from "@/modules/auth/public";
import { handleRoute, jsonResponse } from "@/kernel/http";
import { container } from "@/server/container";
import { requireIdentity } from "@/server/request-context";

/** AUTH-07 GET /api/app/auth/sign-ins (FR-008). */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    const data = await auth.listSignIns(c.database, c.authDeps, identity);
    return jsonResponse(200, { data }, requestId);
  });
}