/**
 * Tasks (FR-090..FR-096): to-dos with an optional subject and topic, an optional due
 * date and a priority (BR-031). A to-do is a task to complete, not a time block, so it
 * has no start or duration (FR-090). To-dos are hard-deleted, never archived (FR-092).
 *
 * The list is ordered by the FR-095 composite: priority rank, then due date ascending
 * with null last, then creation time, then id; with `status=all`, open to-dos precede
 * done ones. Due state (`overdue`, `today`, `within7`, `none`) is computed against the
 * local date of the caller's profile zone (BR-030, FR-094).
 */
import { config } from "../../kernel/config";
import type { Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import { localDateOf, type LocalDate } from "../../kernel/time";
import { uuidv7 } from "../../kernel/crypto";
import * as subjects from "../subjects/public";
import * as topics from "../topics/public";
import { publishTodoEvent } from "./events";

export type TodoPriority = "high" | "medium" | "low";
export type TodoDueState = "overdue" | "today" | "within7" | "none";

/** `Todo` is API-SCHEMAS section 11: the wire shape plus the derived `overdue`. */
export interface Todo {
  id: string;
  title: string;
  subjectId: string | null;
  topicId: string | null;
  dueDate: LocalDate | null;
  priority: TodoPriority;
  done: boolean;
  completedAt: string | null;
  /** Derived: open and `dueDate` before today in the profile zone (FR-094). */
  overdue: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** What the module needs to know about the caller's clock and zone (BR-030). */
export interface TodoContext {
  now: Date;
  timezone: string;
  rolloverHour: number;
}

export interface CreateTodoInput {
  title: string;
  subjectId?: string | undefined;
  topicId?: string | null | undefined;
  dueDate?: LocalDate | null | undefined;
  priority?: TodoPriority | undefined;
}

export interface UpdateTodoInput {
  title?: string | undefined;
  subjectId?: string | null | undefined;
  topicId?: string | null | undefined;
  dueDate?: LocalDate | null | undefined;
  priority?: TodoPriority | undefined;
}

/** TODO-01 query: `PageQuery` plus the FR-094 filters (API-SCHEMAS section 11). */
export interface TodoListQuery {
  status?: "open" | "done" | "all" | undefined;
  subjectId?: string | undefined;
  priority?: TodoPriority | undefined;
  due?: TodoDueState | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
}

export interface TodoPage {
  data: Todo[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface TodoRow {
  id: string;
  subject_id: string | null;
  topic_id: string | null;
  title: string;
  due_date: Date | null;
  priority: TodoPriority;
  done: boolean;
  completed_at: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

const SELECT_TODO = `
  SELECT t.id, t.title, t.subject_id, t.topic_id, t.due_date, t.priority, t.done,
         t.completed_at, t.version, t.created_at, t.updated_at
  FROM todos t`;

function present(row: TodoRow, today: LocalDate): Todo {
  const dueDate = row.due_date === null ? null : row.due_date.toISOString().slice(0, 10);
  return {
    id: row.id,
    title: row.title,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    dueDate,
    priority: row.priority,
    done: row.done,
    completedAt: row.completed_at?.toISOString() ?? null,
    overdue: !row.done && dueDate !== null && dueDate < today,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function fieldsError(path: string, rule: string, extra: Record<string, unknown> = {}): AppError {
  return new AppError("validation_failed", { details: { fields: [{ path, rule, ...extra }] } });
}

/** BR-031: the rank the FR-095 order sorts on; high=0, medium=1, low=2. */
export function priorityRank(priority: TodoPriority): number {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}

/** FR-095: a deterministic sort key (rank, due ascending with null last, age, id). */
export function sortKey(todo: { priority: TodoPriority; dueDate: LocalDate | null; createdAt: string; id: string }): string {
  return [priorityRank(todo.priority), todo.dueDate === null ? "" : todo.dueDate, todo.createdAt, todo.id].join("|");
}

function validateTitle(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > config.todos.titleMaxLength) {
    throw fieldsError("title", "length", { min: 1, max: config.todos.titleMaxLength });
  }
  return trimmed;
}

function validatePriority(value: TodoPriority | undefined): TodoPriority {
  if (value === undefined) return "medium";
  if (value !== "high" && value !== "medium" && value !== "low") {
    throw fieldsError("priority", "enum", { values: ["high", "medium", "low"] });
  }
  return value;
}

function validateDueDate(value: string | null | undefined): LocalDate | null {
  if (value === null || value === undefined) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) throw fieldsError("dueDate", "local_date");
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw fieldsError("dueDate", "local_date");
  }
  return value;
}

/**
 * A topic of the given subject, or `null`; anything else names the field and the rule,
 * so the error never confirms that somebody else's id exists (mirrors PLAN-02).
 */
async function resolveTopic(
  database: Queryable,
  userId: string,
  subjectId: string,
  topicId: string | null,
): Promise<string | null> {
  if (topicId === null) return null;
  let topic: topics.Topic;
  try {
    topic = await topics.getTopic(database, userId, topicId);
  } catch {
    throw fieldsError("topicId", "member_of_subject");
  }
  if (topic.subjectId !== subjectId) throw fieldsError("topicId", "member_of_subject");
  if (topic.archivedAt !== null) throw fieldsError("topicId", "topic_archived");
  return topic.id;
}

/** The subject a to-do points at, rejecting an archived one (BR-029). */
async function requireActiveSubject(
  database: Queryable,
  userId: string,
  subjectId: string,
): Promise<subjects.Subject> {
  const subject = await subjects.getSubject(database, userId, subjectId);
  if (subject.archivedAt !== null) {
    throw new AppError("subject_archived", { details: { subjectId: subject.id } });
  }
  return subject;
}

/** TODO-03 (FR-091): one to-do, `overdue` against today in the profile zone. */
export async function getTodo(
  database: Queryable,
  userId: string,
  todoId: string,
  ctx: TodoContext,
): Promise<Todo> {
  const today = localDateOf(ctx.now, ctx.timezone, ctx.rolloverHour);
  const rows = await database.query<TodoRow>(
    `${SELECT_TODO} WHERE t.id = $1 AND t.user_id = $2`,
    [todoId, userId],
  );
  const row = rows[0];
  if (row === undefined) throw new AppError("not_found");
  return present(row, today);
}

/** TODO-02 (FR-090, FR-096). New to-dos are not done and default to Medium (BR-031). */
export async function createTodo(
  database: Queryable,
  userId: string,
  input: CreateTodoInput,
  ctx: TodoContext,
): Promise<Todo> {
  const title = validateTitle(input.title);
  const priority = validatePriority(input.priority);
  const dueDate = validateDueDate(input.dueDate ?? null);
  const subject = input.subjectId === undefined ? null : await requireActiveSubject(database, userId, input.subjectId);
  const topicId = await resolveTopic(database, userId, subject?.id ?? "", input.topicId ?? null);

  const id = uuidv7();
  await database.query(
    `INSERT INTO todos (id, user_id, title, subject_id, topic_id, due_date, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, userId, title, subject?.id ?? null, topicId, dueDate, priority],
  );
  return getTodo(database, userId, id, ctx);
}

/**
 * TODO-01 (FR-094, FR-095): filtered and cursor-paginated, ordered by the FR-095
 * composite. The cursor encodes (priorityRank, dueDate|null, createdAt, id) plus the
 * open/done group, so a `status=all` page never resumes past a done/not-done boundary
 * into the wrong group.
 */
export async function listTodos(
  database: Queryable,
  userId: string,
  query: TodoListQuery,
  ctx: TodoContext,
): Promise<TodoPage> {
  const limit = query.limit ?? config.todos.pageSize;
  if (!Number.isInteger(limit) || limit < 1 || limit > config.todos.maxPageSize) {
    throw new AppError("invalid_page_size", { details: { limit: config.todos.pageSize } });
  }
  const today = localDateOf(ctx.now, ctx.timezone, ctx.rolloverHour);

  const conditions = ["t.user_id = $1"];
  const values: unknown[] = [userId];

  if (query.subjectId !== undefined) {
    // FR-094: an explicit subject filter on an archived subject returns its to-dos.
    await subjects.getSubject(database, userId, query.subjectId);
    conditions.push(`t.subject_id = $${values.length + 1}`);
    values.push(query.subjectId);
  }
  if (query.priority !== undefined) {
    conditions.push(`t.priority = $${values.length + 1}`);
    values.push(query.priority);
  }
  if (query.due !== undefined) {
    if (query.due === "overdue") {
      // FR-094: overdue never matches done to-dos, even with `status=all`.
      conditions.push(`t.done = false AND t.due_date IS NOT NULL AND t.due_date < $${values.length + 1}`);
      values.push(today);
    } else if (query.due === "today") {
      conditions.push(`t.due_date = $${values.length + 1}`);
      values.push(today);
    } else if (query.due === "within7") {
      const inSeven = new Date(Date.UTC(
        Number(today.slice(0, 4)),
        Number(today.slice(5, 7)) - 1,
        Number(today.slice(8)) + 7,
      )).toISOString().slice(0, 10);
      conditions.push(`t.due_date BETWEEN $${values.length + 1} AND $${values.length + 2}`);
      values.push(today, inSeven);
    } else {
      conditions.push("t.due_date IS NULL");
    }
  }

  if (query.status === "done") {
    conditions.push("t.done = true");
  } else if (query.status === "all") {
    // FR-095: open to-dos precede done ones; the cursor carries the group.
    conditions.push(`(t.done, CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                     t.due_date IS NOT NULL, t.due_date, t.created_at, t.id)
                    > ($${values.length + 1}, $${values.length + 2}, $${values.length + 3},
                      $${values.length + 4}, $${values.length + 5}, $${values.length + 6})`);
    if (query.cursor !== undefined) {
      const decoded = decodeCursor(query.cursor);
      values.push(
        decoded.done,
        decoded.priorityRank,
        decoded.dueDate !== null,
        decoded.dueDate,
        new Date(decoded.createdAtMs),
        decoded.id,
      );
    } else {
      values.push(false, 0, false, null, new Date(0), "00000000-0000-0000-0000-000000000000");
    }
    const rows = await database.query<TodoRow>(
      `${SELECT_TODO} WHERE ${conditions.join(" AND ")}
       ORDER BY t.done, CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                (t.due_date IS NOT NULL), t.due_date, t.created_at, t.id
       LIMIT $${values.length + 1}`,
      [...values, limit + 1],
    );
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];
    return {
      data: pageRows.map((row) => present(row, today)),
      nextCursor:
        hasMore && last !== undefined
          ? encodeCursor(priorityRank(last.priority), last.due_date, last.created_at.getTime(), last.id, last.done)
          : null,
      hasMore,
    };
  }

  // `status=open` (default): keyset on (rank, due null-last, created_at, id).
  conditions.push(
    `t.done = false AND
     (CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.due_date IS NOT NULL, t.due_date, t.created_at, t.id)
     > ($${values.length + 1}, $${values.length + 2}, $${values.length + 3},
       $${values.length + 4}, $${values.length + 5})`,
  );
  if (query.cursor !== undefined) {
    const decoded = decodeCursor(query.cursor);
    values.push(decoded.priorityRank, decoded.dueDate !== null, decoded.dueDate, new Date(decoded.createdAtMs), decoded.id);
  } else {
    values.push(0, false, null, new Date(0), "00000000-0000-0000-0000-000000000000");
  }
  const rows = await database.query<TodoRow>(
    `${SELECT_TODO} WHERE ${conditions.join(" AND ")}
     ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
              (t.due_date IS NOT NULL), t.due_date, t.created_at, t.id
     LIMIT $${values.length + 1}`,
    [...values, limit + 1],
  );
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];
  return {
    data: pageRows.map((row) => present(row, today)),
    nextCursor:
      hasMore && last !== undefined
        ? encodeCursor(priorityRank(last.priority), last.due_date, last.created_at.getTime(), last.id, false)
        : null,
    hasMore,
  };
}

const CURSOR_BODY = Buffer.from("todo").toString("base64url");

/** `priorityRank|dueDate|null|createdAtMs|id|done` with a marker, base64url (API-CONVENTIONS 4). */
export function encodeCursor(
  priorityRankValue: number,
  dueDate: Date | null,
  createdAtMs: number,
  id: string,
  done: boolean,
): string {
  return Buffer.from(
    `${CURSOR_BODY}|${priorityRankValue}|${dueDate === null ? "" : dueDate.toISOString().slice(0, 10)}|${createdAtMs}|${id}|${done ? "1" : "0"}`,
  ).toString("base64url");
}

/** A malformed or tampered cursor answers `invalid_cursor`, never an empty page. */
export function decodeCursor(cursor: string): {
  priorityRank: number;
  dueDate: string | null;
  createdAtMs: number;
  id: string;
  done: boolean;
} {
  let text: string;
  try {
    text = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw new AppError("invalid_cursor");
  }
  const [marker, rank, due, createdAt, id, done] = text.split("|");
  if (
    marker !== CURSOR_BODY ||
    id === undefined ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    !/^[012]$/.test(rank ?? "") ||
    !/^\d+$/.test(createdAt ?? "") ||
    !/^[01]$/.test(done ?? "") ||
    (due !== undefined && due !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(due))
  ) {
    throw new AppError("invalid_cursor");
  }
  const dueDate = due === undefined || due === "" ? null : due;
  if (
    encodeCursor(
      Number(rank),
      dueDate === null ? null : new Date(`${dueDate}T00:00:00Z`),
      Number(createdAt),
      id,
      done === "1",
    ) !== cursor
  ) {
    throw new AppError("invalid_cursor");
  }
  return {
    priorityRank: Number(rank),
    dueDate,
    createdAtMs: Number(createdAt),
    id,
    done: done === "1",
  };
}

/**
 * TODO-04 (FR-091). The version check runs first, so a stale editor answers with the
 * current to-do (EC-020); `dueDate: null` clears the date, `subjectId: null` also clears
 * the topic (AC-FR-091-2). `done` is not part of this surface.
 */
export async function editTodo(
  database: Queryable,
  userId: string,
  todoId: string,
  expectedVersion: number | null,
  input: UpdateTodoInput,
  ctx: TodoContext,
): Promise<Todo> {
  if (expectedVersion === null) throw new AppError("version_required");
  if (
    input.title === undefined &&
    input.subjectId === undefined &&
    input.topicId === undefined &&
    input.dueDate === undefined &&
    input.priority === undefined
  ) {
    throw fieldsError("body", "at_least_one_field");
  }

  const today = localDateOf(ctx.now, ctx.timezone, ctx.rolloverHour);
  const rows = await database.query<TodoRow>(
    `${SELECT_TODO} WHERE t.id = $1 AND t.user_id = $2`,
    [todoId, userId],
  );
  const current = rows[0];
  if (current === undefined) throw new AppError("not_found");
  if (current.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current: present(current, today) } });
  }

  const title = input.title === undefined ? current.title : validateTitle(input.title);
  const priority = input.priority === undefined ? current.priority : validatePriority(input.priority);
  const dueDate = input.dueDate === undefined ? (current.due_date === null ? null : current.due_date.toISOString().slice(0, 10)) : validateDueDate(input.dueDate);
  // A new subject needs a topic of its own; `subjectId: null` drops both (AC-FR-091-2).
  const subjectId = input.subjectId === undefined ? current.subject_id : input.subjectId;
  const subject = subjectId === null ? null : await requireActiveSubject(database, userId, subjectId);
  const topicId =
    input.topicId !== undefined || subjectId !== current.subject_id
      ? await resolveTopic(database, userId, subject?.id ?? "", input.topicId === undefined ? (subjectId === null ? null : current.topic_id) : input.topicId)
      : current.topic_id;

  const updated = await database.query<{ id: string }>(
    `UPDATE todos
     SET title = $3, subject_id = $4, topic_id = $5, due_date = $6, priority = $7,
         version = version + 1, updated_at = now()
     WHERE user_id = $1 AND id = $2 AND version = $8
     RETURNING id`,
    [userId, todoId, title, subjectId, topicId, dueDate, priority, expectedVersion],
  );
  if (updated.length === 0) {
    throw new AppError("stale_version", { details: { current: await getTodo(database, userId, todoId, ctx) } });
  }
  return getTodo(database, userId, todoId, ctx);
}

/**
 * TODO-05 (FR-093): idempotent set of done. `true` records the completion time,
 * `false` clears it (AC-FR-093-1, AC-FR-093-2). Sending the current state changes
 * nothing: no version bump, no event (AC-FR-093-3). `TodoCompleted` publishes only on
 * the false-to-true transition (FR-172, EC-017), after the write commits.
 */
export async function setTodoCompletion(
  database: Queryable,
  userId: string,
  todoId: string,
  done: boolean,
  ctx: TodoContext,
): Promise<Todo> {
  const today = localDateOf(ctx.now, ctx.timezone, ctx.rolloverHour);
  const rows = await database.query<TodoRow>(
    `${SELECT_TODO} WHERE t.id = $1 AND t.user_id = $2`,
    [todoId, userId],
  );
  const current = rows[0];
  if (current === undefined) throw new AppError("not_found");
  if (current.done === done) return present(current, today);

  const updated = await database.query<{ id: string; subject_id: string | null }>(
    `UPDATE todos
     SET done = $3, completed_at = $4, version = version + 1, updated_at = now()
     WHERE user_id = $1 AND id = $2
     RETURNING id, subject_id`,
    [userId, todoId, done, done ? new Date() : null],
  );
  if (updated.length === 0) throw new AppError("not_found");
  const todo = await getTodo(database, userId, todoId, ctx);
  if (done) {
    const row = updated[0];
    await publishTodoEvent({
      type: "TodoCompleted",
      todoId,
      subjectId: row?.subject_id ?? null,
      userId,
      occurredAt: todo.completedAt ?? new Date().toISOString(),
    });
  }
  return todo;
}

/** TODO-06 (FR-092): hard delete; a retry after success is 404 (AC-FR-092-3). */
export async function deleteTodo(
  database: Queryable,
  userId: string,
  todoId: string,
  expectedVersion: number | null,
): Promise<void> {
  if (expectedVersion === null) throw new AppError("version_required");
  const deleted = await database.query<{ id: string }>(
    `DELETE FROM todos WHERE user_id = $1 AND id = $2 AND version = $3
     RETURNING id`,
    [userId, todoId, expectedVersion],
  );
  const row = deleted[0];
  if (row === undefined) {
    const today = localDateOf(new Date(), "UTC", 0);
    const rows = await database.query<TodoRow>(
      `${SELECT_TODO} WHERE t.id = $1 AND t.user_id = $2`,
      [todoId, userId],
    );
    if (rows[0] === undefined) throw new AppError("not_found");
    throw new AppError("stale_version", { details: { current: present(rows[0], today) } });
  }
}

/** Registered purge handler (NFR-031); `user_id` cascades, so the rows go with them. */
export async function purgeTodos(userId: string, database: Queryable): Promise<number> {
  const rows = await database.query<{ id: string }>(
    "DELETE FROM todos WHERE user_id = $1 RETURNING id",
    [userId],
  );
  return rows.length;
}

/** Registered export contributor (FR-130, FR-131). */
export async function exportTodos(userId: string, database: Queryable): Promise<unknown[]> {
  return database.query<Record<string, unknown>>(
    `SELECT t.id, t.title, t.subject_id, t.topic_id, t.due_date::text, t.priority, t.done,
            t.completed_at, t.created_at, t.updated_at
     FROM todos t WHERE t.user_id = $1 ORDER BY t.created_at, t.id`,
    [userId],
  );
}
