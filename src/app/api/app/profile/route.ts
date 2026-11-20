import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import * as profile from "@/modules/profile/public";
import { container } from "@/server/container";
import { enforceUserRate, ifMatchVersion, requireIdentity, updateProfileSchema } from "@/server/request-context";

/** PROF-01 GET /api/app/profile (FR-006, FR-009, FR-137, FR-138). */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");
    const view = await profile.getProfile(c.database, identity.userId);
    return jsonResponse(200, view, requestId, { etag: `"${view.version}"` });
  });
}

/** PROF-02 PATCH /api/app/profile. `If-Match` is required (ADR-011). */
export async function PATCH(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const expectedVersion = ifMatchVersion(request);

    const input = await readJson(request, updateProfileSchema);
    const patch: profile.ProfilePatch = {};
    if (input.displayName !== undefined) patch.displayName = input.displayName;
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.rolloverHour !== undefined) patch.rolloverHour = input.rolloverHour;
    if (input.theme !== undefined) patch.theme = input.theme;
    if (input.primaryGoal !== undefined) patch.primaryGoal = input.primaryGoal;

    const view = await profile.updateProfile(c.database, identity.userId, expectedVersion, patch, new Date());
    return jsonResponse(200, view, requestId, { etag: `"${view.version}"` });
  });
}