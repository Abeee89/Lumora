/**
 * MODULE-BOUNDARIES section 3: Tasks owns the TodoCompleted contract (FR-172, EC-017).
 * Gamification consumes it in Phase 2; in M10 no subscriber exists, so delivery is the
 * in-process registry write after commit, logged on failure (mirrors Plans M05).
 */
import { logger } from "../../kernel/logger";
import { createRegistry } from "../../kernel/registries";

export type TodoEvent = {
  type: "TodoCompleted";
  todoId: string;
  subjectId: string | null;
  userId: string;
  occurredAt: string;
};

export type TodoEventSubscriber = (event: TodoEvent) => Promise<void>;

export const todoEventSubscribers = createRegistry<TodoEventSubscriber>("todo event subscriber");

/**
 * A failing subscriber is logged and dropped: the write it reports has already committed,
 * so raising would report success as failure.
 */
export async function publishTodoEvent(event: TodoEvent): Promise<void> {
  const results = await Promise.allSettled(
    todoEventSubscribers.entries().map(([, subscriber]) => subscriber(event)),
  );
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const source = todoEventSubscribers.entries()[index]?.[0] ?? "unknown";
      logger.error({ err: result.reason, source, event: event.type }, "todo.event.failed");
    }
  }
}
