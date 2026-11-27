import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, noContentResponse, readJson } from "@/kernel/http";
import * as profile from "@/modules/profile/public";
import * as tasks from "@/modules/tasks/public";
import { container } from "@/server/container";
import {
  enforceUserRate,
  ifMatchVersion,
  requireIdentity,
  updateTodoSchema,
} from "@/server/request-context";

async function todoIdOf(context: { params: Promise<{ todoId: string }> }): Promise<string> {
  const { todoId } = await context.params;
  if (!isUuid(todoId)) throw new AppError("not_found");
  return todoId;
}

/** TODO-03 GET /api/app/todos/{todoId} (FR-091). */
export async function GET(
  request: Request,
  context: { params: Promise<{ todoId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const todo = await tasks.getTodo(c.database, identity.userId, await todoIdOf(context), {
      now: new Date(),
      timezone: clock.timezone,
      rolloverHour: clock.rolloverHour,
    });
    return jsonResponse(200, todo, requestId, { etag: `"${todo.version}"` });
  });
}

/** TODO-04 PATCH /api/app/todos/{todoId} (FR-091). `If-Match` required (ADR-011). */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ todoId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const todoId = await todoIdOf(context);
    const input = await readJson(request, updateTodoSchema);
    // An explicit null drops the field, so presence decides, not truthiness.
    const patch: tasks.UpdateTodoInput = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.subjectId !== undefined) patch.subjectId = input.subjectId;
    if (input.topicId !== undefined) patch.topicId = input.topicId;
    if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
    if (input.priority !== undefined) patch.priority = input.priority;

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const todo = await tasks.editTodo(c.database, identity.userId, todoId, ifMatchVersion(request), patch, {
      now: new Date(),
      timezone: clock.timezone,
      rolloverHour: clock.rolloverHour,
    });
    return jsonResponse(200, todo, requestId, { etag: `"${todo.version}"` });
  });
}

/** TODO-06 DELETE /api/app/todos/{todoId} (FR-092). A retry after success is 404. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ todoId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    await tasks.deleteTodo(c.database, identity.userId, await todoIdOf(context), ifMatchVersion(request));
    return noContentResponse(requestId);
  });
}
