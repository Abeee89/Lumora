"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Todo, TodoPriority } from "@/modules/tasks/public";
import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ErrorPanel, Label, Panel, SelectInput, TextInput, formId } from "../control";
import { Dialog } from "../dialog";
import { formatLocalDate } from "../format";
import { SubjectDot } from "../subject-dot";
import { failureBody } from "./feedback";

interface TodoListPage {
  data: Todo[];
  page: { nextCursor: string | null; hasMore: boolean };
}

type StatusFilter = "open" | "done" | "all";
type DueFilter = "" | "overdue" | "today" | "within7" | "none";

interface SubjectOption {
  id: string;
  name: string;
  colour: string;
  archived: boolean;
}

const PRIORITIES: readonly { value: TodoPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const priorityLabel: Record<TodoPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** "Overdue by 2 days" / "Due Mar 12" (A-9). */
function dueText(todo: Todo, today: string): string {
  if (todo.dueDate === null) return "No due date";
  if (todo.overdue) {
    const days = Math.max(
      1,
      Math.round(
        (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${todo.dueDate}T00:00:00Z`)) / 86_400_000,
      ),
    );
    return `Overdue by ${days} ${days === 1 ? "day" : "days"}`;
  }
  if (todo.dueDate === today) return "Due today";
  return `Due ${formatLocalDate(todo.dueDate, { day: "numeric", month: "short" })}`;
}

/** A-9 To-dos (FR-090..FR-096): quick add, filters, priority-then-due list. */
export function TodoList({
  subjects,
  initial,
  nextCursor: initialCursor,
  hasMore: initialHasMore,
  today,
}: {
  subjects: readonly SubjectOption[];
  initial: Todo[];
  nextCursor: string | null;
  hasMore: boolean;
  today: string;
}) {
  const [rows, setRows] = useState<Todo[] | null>(initial);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [dueFilter, setDueFilter] = useState<DueFilter>("");
  const [dialog, setDialog] = useState<
    { kind: "edit"; todo: Todo } | { kind: "delete"; todo: Todo } | null
  >(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toggleError, setToggleError] = useState<{ id: string; failure: ApiFailure } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [addError, setAddError] = useState<ApiFailure | null>(null);
  const [titleEmpty, setTitleEmpty] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const activeSubjects = subjects.filter((subject) => !subject.archived);

  const load = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams({ status: statusFilter, limit: "50" });
      if (subjectFilter !== "") params.set("subjectId", subjectFilter);
      if (priorityFilter !== "") params.set("priority", priorityFilter);
      if (dueFilter !== "") params.set("due", dueFilter);
      if (cursor !== undefined) params.set("cursor", cursor);
      const result = await apiRequest<TodoListPage>(`/api/app/todos?${params}`, {
        method: "GET",
      });
      if (!result.ok) {
        setFailure(result.failure);
        return;
      }
      setFailure(null);
      setRows((previous) =>
        cursor === undefined ? result.data.data : [...(previous ?? []), ...result.data.data],
      );
      setNextCursor(result.data.page.nextCursor);
      setHasMore(result.data.page.hasMore);
    },
    [statusFilter, subjectFilter, priorityFilter, dueFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const announce = (message: string) => setAnnouncement(message);

  const add = async () => {
    if (title.trim() === "") {
      setTitleEmpty(true);
      titleRef.current?.focus();
      return;
    }
    setAdding(true);
    setTitleEmpty(false);
    setAddError(null);
    const body: Record<string, unknown> = { title: title.trim(), priority };
    if (dueDate !== "") body["dueDate"] = dueDate;
    if (subjectId !== "") body["subjectId"] = subjectId;
    const result = await apiRequest<Todo>("/api/app/todos", {
      method: "POST",
      headers: { "idempotency-key": crypto.randomUUID() },
      body,
    });
    setAdding(false);
    if (!result.ok) {
      setAddError(result.failure);
      return;
    }
    setTitle("");
    setDueDate("");
    setSubjectId("");
    setMoreOpen(false);
    announce("Task added");
    if (statusFilter === "open") {
      setRows((previous) => [result.data, ...(previous ?? [])]);
    } else {
      await load();
    }
    titleRef.current?.focus();
  };

  const toggle = async (todo: Todo) => {
    setBusy(todo.id);
    setToggleError(null);
    const result = await apiRequest<Todo>(`/api/app/todos/${todo.id}/completion`, {
      method: "PUT",
      body: { done: !todo.done },
    });
    setBusy(null);
    if (!result.ok) {
      setToggleError({ id: todo.id, failure: result.failure });
      return;
    }
    setRows((previous) =>
      (previous ?? []).map((row) => (row.id === todo.id ? result.data : row)),
    );
    announce(result.data.done ? "Task marked done" : "Task marked open");
  };

  const remove = async (todo: Todo) => {
    setBusy(todo.id);
    const result = await apiRequest<void>(`/api/app/todos/${todo.id}`, {
      method: "DELETE",
      headers: { "if-match": `"${todo.version}"` },
    });
    setBusy(null);
    if (!result.ok) {
      setFailure(result.failure);
      return;
    }
    setDialog(null);
    setRows((previous) => (previous ?? []).filter((row) => row.id !== todo.id));
    announce("Task deleted");
  };

  const saveEdit = async (todo: Todo, patch: Record<string, unknown>) => {
    setEditBusy(true);
    const result = await apiRequest<Todo>(`/api/app/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "if-match": `"${todo.version}"` },
      body: patch,
    });
    setEditBusy(false);
    if (!result.ok) return result.failure;
    setDialog(null);
    setRows((previous) =>
      (previous ?? []).map((row) => (row.id === todo.id ? result.data : row)),
    );
    announce("Task updated");
    return null;
  };

  const clearFilters = () => {
    setStatusFilter("open");
    setSubjectFilter("");
    setPriorityFilter("");
    setDueFilter("");
  };

  const filtersActive =
    statusFilter !== "open" || subjectFilter !== "" || priorityFilter !== "" || dueFilter !== "";

  const shown = rows ?? [];
  const loading = rows === null && failure === null;
  const subjectName = (id: string | null): string =>
    subjects.find((subject) => subject.id === id)?.name ?? "No subject";

  return (
    <div className="space-y-4">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-48 flex-1">
            <TextInput
              ref={titleRef}
              id={formId("todoTitle")}
              type="text"
              value={title}
              onChange={setTitle}
              placeholder={shown.length === 0 && !filtersActive ? "Add your first task" : "Add a task"}
              invalid={titleEmpty || (addError !== null && addError.code === "empty_title")}
              describedBy={titleEmpty ? formId("todoAddError") : undefined}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={formId("todoPriority")}>Priority</Label>
            <SelectInput
              id={formId("todoPriority")}
              value={priority}
              onChange={(value) => setPriority(value as TodoPriority)}
              options={PRIORITIES.map((entry) => ({ value: entry.value, label: entry.label }))}
            />
          </div>
          <Button pending={adding} onClick={() => void add()}>
            Add task
          </Button>
        </div>

        <div>
          <button
            type="button"
            className="text-sm font-semibold text-primary hover:underline"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            {moreOpen ? "Hide" : "More"} fields
          </button>
          {moreOpen && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={formId("todoDueDate")}>Due date</Label>
                <TextInput
                  id={formId("todoDueDate")}
                  type="date"
                  value={dueDate}
                  onChange={setDueDate}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={formId("todoSubject")}>Subject</Label>
                <SelectInput
                  id={formId("todoSubject")}
                  value={subjectId}
                  onChange={setSubjectId}
                  options={[
                    { value: "", label: "No subject" },
                    ...activeSubjects.map((subject) => ({
                      value: subject.id,
                      label: subject.name,
                    })),
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {titleEmpty && (
          <p id={formId("todoAddError")} className="text-sm text-error">
            Enter a task title
          </p>
        )}
        {addError !== null && (
          <p id={formId("todoAddError")} className="text-sm text-error">
            {failureBody(addError)}
          </p>
        )}
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor={formId("todoFilterStatus")}>Status</Label>
          <SelectInput
            id={formId("todoFilterStatus")}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={[
              { value: "open", label: "Open" },
              { value: "done", label: "Done" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("todoFilterSubject")}>Subject</Label>
          <SelectInput
            id={formId("todoFilterSubject")}
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[
              { value: "", label: "All subjects" },
              ...subjects.map((subject) => ({
                value: subject.id,
                label: subject.archived ? `${subject.name} (archived)` : subject.name,
              })),
            ]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("todoFilterPriority")}>Priority</Label>
          <SelectInput
            id={formId("todoFilterPriority")}
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: "", label: "All priorities" },
              ...PRIORITIES.map((entry) => ({ value: entry.value, label: entry.label })),
            ]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("todoFilterDue")}>Due</Label>
          <SelectInput
            id={formId("todoFilterDue")}
            value={dueFilter}
            onChange={(value) => setDueFilter(value as DueFilter)}
            options={[
              { value: "", label: "Any due date" },
              { value: "overdue", label: "Overdue" },
              { value: "today", label: "Due today" },
              { value: "within7", label: "Within 7 days" },
              { value: "none", label: "No due date" },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div aria-busy="true" className="space-y-2">
          <p role="status" className="sr-only">
            Loading tasks
          </p>
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-12 rounded-card border border-line bg-sunken" />
          ))}
        </div>
      ) : failure !== null ? (
        <ErrorPanel
          title="Could not load tasks"
          body={failureBody(failure)}
          requestId={failure.requestId}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        <Panel className="space-y-3">
          <p className="text-ink-2">No tasks</p>
          {filtersActive && (
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </Panel>
      ) : (
        <ul className="space-y-2">
          {shown.map((todo) => {
            const subject = subjects.find((entry) => entry.id === todo.subjectId);
            return (
              <li
                key={todo.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-line bg-surface p-3"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    disabled={busy === todo.id}
                    onChange={() => void toggle(todo)}
                    className="size-4"
                  />
                  <span className="sr-only">
                    Mark "{todo.title}" {todo.done ? "open" : "done"}
                  </span>
                </label>
                <SubjectDot colour={subject?.colour ?? "teal"} />
                <p
                  className={`text-[15px] font-semibold text-ink ${
                    todo.done ? "line-through text-muted" : ""
                  }`}
                >
                  {todo.title}
                </p>
                <p className="w-full text-sm text-muted sm:w-auto">
                  {subjectName(todo.subjectId)}
                  {todo.dueDate !== null && ` · ${dueText(todo, today)}`}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    todo.priority === "high"
                      ? "border-error text-error"
                      : todo.priority === "medium"
                        ? "border-primary text-primary"
                        : "border-line text-ink-2"
                  }`}
                >
                  {priorityLabel[todo.priority]}
                </span>
                {todo.done && (
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-2">
                    Done
                  </span>
                )}
                <div
                  className="relative ml-auto"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setMenuFor(null);
                  }}
                >
                  <Button
                    variant="secondary"
                    ariaLabel={`More actions for ${todo.title}`}
                    onClick={() => setMenuFor(menuFor === todo.id ? null : todo.id)}
                  >
                    Actions
                  </Button>
                  {menuFor === todo.id && (
                    <ul className="absolute right-0 z-10 mt-1 w-48 rounded-card border border-line bg-surface p-1">
                      <MenuItem
                        onClick={() => {
                          setMenuFor(null);
                          setDialog({ kind: "edit", todo });
                        }}
                      >
                        Edit
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          setMenuFor(null);
                          setDialog({ kind: "delete", todo });
                        }}
                      >
                        Delete
                      </MenuItem>
                    </ul>
                  )}
                </div>
                {toggleError?.id === todo.id && (
                  <p className="w-full text-sm text-error">
                    {failureBody(toggleError.failure)}{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline"
                      onClick={() => void toggle(todo)}
                    >
                      Retry
                    </button>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && rows !== null && (
        <Button
          variant="secondary"
          pending={loadingMore}
          onClick={async () => {
            if (nextCursor === null) return;
            setLoadingMore(true);
            await load(nextCursor);
            setLoadingMore(false);
          }}
        >
          Load more
        </Button>
      )}

      {dialog?.kind === "edit" && (
        <TodoEditDialog
          todo={dialog.todo}
          subjects={subjects}
          busy={editBusy}
          onClose={() => setDialog(null)}
          onSubmit={saveEdit}
        />
      )}

      {dialog?.kind === "delete" && (
        <Dialog open title={`Delete task '${dialog.todo.title}'?`} onClose={() => setDialog(null)}>
          <div className="space-y-4">
            <p className="text-sm text-ink-2">
              The task is removed and can no longer be completed or edited.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button pending={busy === dialog.todo.id} onClick={() => void remove(dialog.todo)}>
                Delete task
              </Button>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-md px-3 py-2 text-left text-[15px] text-ink hover:bg-sunken"
      >
        {children}
      </button>
    </li>
  );
}

function TodoEditDialog({
  todo,
  subjects,
  busy,
  onClose,
  onSubmit,
}: {
  todo: Todo;
  subjects: readonly SubjectOption[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (todo: Todo, patch: Record<string, unknown>) => Promise<ApiFailure | null>;
}) {
  const [title, setTitle] = useState(todo.title);
  const [priority, setPriority] = useState<TodoPriority>(todo.priority);
  const [dueDate, setDueDate] = useState(todo.dueDate ?? "");
  const [subjectId, setSubjectId] = useState(todo.subjectId ?? "");
  const [error, setError] = useState<ApiFailure | null>(null);
  const [titleEmpty, setTitleEmpty] = useState(false);

  const submit = async () => {
    if (title.trim() === "") {
      setTitleEmpty(true);
      return;
    }
    setTitleEmpty(false);
    const patch: Record<string, unknown> = { title: title.trim(), priority };
    if (dueDate !== "") patch["dueDate"] = dueDate;
    else patch["dueDate"] = null;
    if (subjectId !== "") {
      patch["subjectId"] = subjectId;
      // A topic belongs to one subject; moving to another subject clears it (FR-090).
      if (subjectId !== todo.subjectId) patch["topicId"] = null;
    } else {
      patch["subjectId"] = null;
    }
    const failure = await onSubmit(todo, patch);
    if (failure !== null) setError(failure);
  };

  return (
    <Dialog open title="Edit task" onClose={onClose}>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor={formId("editTitle")}>Task title</Label>
          <TextInput
            id={formId("editTitle")}
            type="text"
            value={title}
            onChange={setTitle}
            invalid={titleEmpty}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("editPriority")}>Priority</Label>
          <SelectInput
            id={formId("editPriority")}
            value={priority}
            onChange={(value) => setPriority(value as TodoPriority)}
            options={PRIORITIES.map((entry) => ({ value: entry.value, label: entry.label }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("editDueDate")}>Due date</Label>
          <TextInput
            id={formId("editDueDate")}
            type="date"
            value={dueDate}
            onChange={setDueDate}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("editSubject")}>Subject</Label>
          <SelectInput
            id={formId("editSubject")}
            value={subjectId}
            onChange={setSubjectId}
            options={[
              { value: "", label: "No subject" },
              ...subjects.map((subject) => ({
                value: subject.id,
                label: subject.archived ? `${subject.name} (archived)` : subject.name,
              })),
            ]}
          />
        </div>
        {titleEmpty && <p className="text-sm text-error">Enter a task title</p>}
        {error !== null && <p className="text-sm text-error">{failureBody(error)}</p>}
        <div className="flex flex-wrap gap-3">
          <Button pending={busy} onClick={() => void submit()}>
            Save task
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
