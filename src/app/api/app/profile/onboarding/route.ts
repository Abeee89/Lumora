import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import * as profile from "@/modules/profile/public";
import { container } from "@/server/container";
import {
  enforceUserRate,
  requireIdentity,
  updateOnboardingSchema,
} from "@/server/request-context";

/** PROF-03 PATCH /api/app/profile/onboarding (FR-134..FR-137). No `If-Match` by design. */
export async function PATCH(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const input = await readJson(request, updateOnboardingSchema);
    const state = await profile.updateOnboarding(
      c.database,
      identity.userId,
      input.action === "complete_step"
        ? { action: "complete_step", step: input.step ?? "" }
        : { action: input.action },
      new Date(),
    );

    return jsonResponse(200, state, requestId);
  });
}