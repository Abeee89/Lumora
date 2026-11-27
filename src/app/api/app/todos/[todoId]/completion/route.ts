import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import * as profile from "@/modules/profile/public";
import * as tasks from "@/modules/tasks/public";
import { container } from "@/server/container";
import { enforceUserRate, requireIdentity, setTodoCompletionSchema } from "@/server/request-context";

/** TODO-05 PUT /api/app/todos/{todoId}/completion (FR-093). Idempotent set, no `If-Match`. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ todoId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const { todoId } = await context.params;
    if (!isUuid(todoId)) throw new AppError("not_found");
    const input = await readJson(request, setTodoCompletionSchema);

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const todo = await tasks.setTodoCompletion(c.database, identity.userId, todoId, input.done, {
      now: new Date(),
      timezone: clock.timezone,
      rolloverHour: clock.rolloverHour,
    });
    return jsonResponse(200, todo, requestId, { etag: `"${todo.version}"` });
  });
}
