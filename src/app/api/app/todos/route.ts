import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { runIdempotent } from "@/kernel/idempotency";
import * as profile from "@/modules/profile/public";
import * as tasks from "@/modules/tasks/public";
import { container } from "@/server/container";
import {
  createTodoSchema,
  enforceUserRate,
  requiredIdempotencyKey,
  requireIdentity,
  todoListQuery,
} from "@/server/request-context";

/** TODO-01 GET /api/app/todos (FR-094, FR-095). Filtered, FR-095 ordered, cursor paginated. */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const parsed = todoListQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) {
      throw new AppError("validation_failed", {
        details: {
          fields: parsed.error.issues.map((issue) => ({
            path: issue.path.join(".") || "query",
            rule: issue.code,
          })),
        },
      });
    }

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const page = await tasks.listTodos(c.database, identity.userId, parsed.data, {
      now: new Date(),
      timezone: clock.timezone,
      rolloverHour: clock.rolloverHour,
    });
    return jsonResponse(200, page, requestId, { "cache-control": "no-store" });
  });
}

/** TODO-02 POST /api/app/todos (FR-090, FR-096). `Idempotency-Key` required (EC-021). */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const key = requiredIdempotencyKey(request);
    const input = await readJson(request, createTodoSchema);
    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const context: tasks.TodoContext = {
      now: new Date(),
      timezone: clock.timezone,
      rolloverHour: clock.rolloverHour,
    };

    const result = await runIdempotent({
      database: c.database,
      store: c.idempotency,
      userId: identity.userId,
      scope: "todo.create",
      key,
      payload: { method: "POST", path: "/api/app/todos", body: input },
      run: async (tx) => {
        const created = await tasks.createTodo(tx, identity.userId, input, context);
        return { status: 201, body: created };
      },
    });

    const headers: Record<string, string> = {
      etag: `"${result.body.version}"`,
      location: `/api/app/todos/${result.body.id}`,
    };
    if (result.replayed) headers["idempotent-replay"] = "true";
    return jsonResponse(result.status, result.body, requestId, headers);
  });
}
