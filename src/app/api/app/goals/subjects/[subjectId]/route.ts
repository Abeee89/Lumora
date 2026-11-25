import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import {
  assertSameOrigin,
  handleRoute,
  jsonResponse,
  noContentResponse,
  readJson,
} from "@/kernel/http";
import * as goals from "@/modules/goals/public";
import { container } from "@/server/container";
import { enforceUserRate, requireIdentity, setSubjectGoalSchema } from "@/server/request-context";

/**
 * GOAL-03 PUT /api/app/goals/subjects/{subjectId} (FR-071): set or replace one subject's
 * target. An archived subject is refused (BR-029); the overall goal is untouched.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ subjectId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const { subjectId } = await context.params;
    if (!isUuid(subjectId)) throw new AppError("not_found");

    const input = await readJson(request, setSubjectGoalSchema);
    const goal = await goals.setSubjectGoal(
      c.database,
      identity.userId,
      subjectId,
      input.targetMinutes,
    );
    return jsonResponse(200, goal, requestId);
  });
}

/**
 * GOAL-04 DELETE /api/app/goals/subjects/{subjectId} (FR-071): remove the target. Idempotent,
 * and allowed while the subject is archived; an unknown or foreign subject is `not_found`.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ subjectId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const { subjectId } = await context.params;
    if (!isUuid(subjectId)) throw new AppError("not_found");

    await goals.removeSubjectGoal(c.database, identity.userId, subjectId);
    return noContentResponse(requestId);
  });
}
