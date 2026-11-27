import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { localDateOf } from "@/kernel/time";
import { listSubjects } from "@/modules/subjects/public";
import { getUserClockContext } from "@/modules/profile/public";
import * as tasks from "@/modules/tasks/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import { TodoList } from "@/ui/forms/todo-list";

export const metadata: Metadata = { title: "To-dos · Lumora" };

/** A-9 To-dos (FR-090..FR-096). The open list paints server-side; the client filters. */
export default async function TodosPage() {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const database = container().database;
  const clock = await getUserClockContext(database, session.userId);
  const now = new Date();
  const context: tasks.TodoContext = {
    now,
    timezone: clock.timezone,
    rolloverHour: clock.rolloverHour,
  };
  const initial = await tasks.listTodos(database, session.userId, { status: "open" }, context);
  const subjects = await listSubjects(database, session.userId, true);
  const options = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    colour: subject.color,
    archived: subject.archivedAt !== null,
  }));

  return (
    <div className="mx-auto max-w-[960px] space-y-6 px-4 py-6 sm:px-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        To-dos
      </h1>
      <p className="text-ink-2">Tasks with a priority and an optional due date. Sorted by priority, then due date.</p>
      <TodoList
        subjects={options}
        today={localDateOf(now, clock.timezone, clock.rolloverHour)}
        initial={initial.data}
        nextCursor={initial.nextCursor}
        hasMore={initial.hasMore}
      />
    </div>
  );
}
