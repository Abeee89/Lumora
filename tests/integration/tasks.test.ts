import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { exportContributors, purgeHandlers } from "@/kernel/registries";
import { todoEventSubscribers, type TodoEvent } from "@/modules/tasks/public";
import {
  call,
  database,
  errorEnvelopeSchema,
  parseBody,
  signUpUser,
  subjectSchema,
  todoListSchema,
  todoSchema,
  type SubjectWire,
  type TestUser,
  type TodoListWire,
  type TodoWire,
} from "./support/api";
import { startApiEnvironment, type ApiEnvironment } from "./support/environment";
import { expectHiddenFromOtherUser } from "./support/ownership";

/**
 * MILESTONES M10 acceptance for TODO-01..TODO-06 (FR-090..FR-096): the default Medium
 * and not-done start (AC-FR-090-1), the 200-character title bound (AC-FR-090-2), the
 * topic-belongs-to-subject rule (AC-FR-090-3, AC-FR-090-4), the archived-subject refusal
 * (BR-029), the FR-095 order with the null-due-date-last rule, the FR-094 filters
 * including overdue/today/within7/none against the profile zone (BR-030), cursor
 * pagination, the idempotent create and completion (AC-FR-093-3), the version guard on
 * edit and delete (AC-FR-091-3, EC-020), the hard delete (AC-FR-092-3) and the
 * ownership contract.
 *
 * Every timestamp is a fixed date, and users sign up in UTC, so `today` in the profile
 * zone is the UTC date and the suite never races the local day boundary.
 */
describe("todo endpoints", () => {
  let environment: ApiEnvironment;
  const events: TodoEvent[] = [];

  beforeAll(async () => {
    environment = await startApiEnvironment();
    todoEventSubscribers.register("integration-test-tasks", async (event) => {
      events.push(event);
    });
  }, 240_000);

  afterAll(async () => {
    await database().end();
    await environment?.stop();
  });

  const errorOf = (response: { body: unknown; status: number }) =>
    parseBody(errorEnvelopeSchema, response, "error");

  /** The current UTC date plus `days`; the profile zone is UTC, so this is "today". */
  const dayAfter = (days: number): string => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  async function createSubject(user: TestUser, name: string): Promise<SubjectWire> {
    const response = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name, color: "teal" },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(subjectSchema, response, "POST subject");
  }

  async function createTopic(user: TestUser, subjectId: string, name: string): Promise<{ id: string }> {
    const response = await call(`/api/app/subjects/${subjectId}/topics`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    const body = response.body as { id: string };
    return body;
  }

  async function createTodo(
    user: TestUser,
    body: Record<string, unknown>,
  ): Promise<TodoWire> {
    const response = await call("/api/app/todos", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body,
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(todoSchema, response, "POST todo");
  }

  const listOf = async (user: TestUser, query = ""): Promise<TodoListWire> => {
    const response = await call(`/api/app/todos${query}`, { cookie: user.cookie });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return parseBody(todoListSchema, response, "GET todos");
  };

  const complete = async (user: TestUser, todoId: string, done: boolean): Promise<TodoWire> => {
    const response = await call(`/api/app/todos/${todoId}/completion`, {
      method: "PUT",
      cookie: user.cookie,
      body: { done },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return parseBody(todoSchema, response, "PUT completion");
  };

  describe("TODO-02 create", () => {
    it("starts not done with priority Medium and no due date (AC-FR-090-1, AC-FR-096-1)", async () => {
      const user = await signUpUser();
      const todo = await createTodo(user, { title: "Read chapter 4" });
      expect(todo).toMatchObject({
        title: "Read chapter 4",
        priority: "medium",
        done: false,
        completedAt: null,
        dueDate: null,
        subjectId: null,
        topicId: null,
        overdue: false,
        version: 1,
      });
    });

    it("accepts exactly 200 characters and rejects 201 (AC-FR-090-2)", async () => {
      const user = await signUpUser();
      const at200 = await createTodo(user, { title: "a".repeat(200) });
      expect(at200.title).toHaveLength(200);

      const at201 = await call("/api/app/todos", {
        method: "POST",
        cookie: user.cookie,
        headers: { "idempotency-key": crypto.randomUUID() },
        body: { title: "a".repeat(201) },
      });
      expect(at201.status).toBe(400);
      expect(errorOf(at201)).toMatchObject({ code: "validation_failed" });

      const whitespace = await call("/api/app/todos", {
        method: "POST",
        cookie: user.cookie,
        headers: { "idempotency-key": crypto.randomUUID() },
        body: { title: "   " },
      });
      expect(whitespace.status).toBe(400);
      expect(errorOf(whitespace)).toMatchObject({ code: "validation_failed" });
    });

    it("rejects a topic that belongs to another subject (AC-FR-090-4)", async () => {
      const user = await signUpUser();
      const biology = await createSubject(user, "Biology");
      const chemistry = await createSubject(user, "Chemistry");
      const topic = await createTopic(user, biology.id, "Cells");

      const response = await call("/api/app/todos", {
        method: "POST",
        cookie: user.cookie,
        headers: { "idempotency-key": crypto.randomUUID() },
        body: { title: "Task", subjectId: chemistry.id, topicId: topic.id },
      });
      expect(response.status).toBe(400);
      expect(errorOf(response)).toMatchObject({ code: "validation_failed" });
      expect(await listOf(user)).toEqual({ data: [], page: { nextCursor: null, hasMore: false } });
    });

    it("rejects an archived subject with subject_archived (BR-029)", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "History");
      await call(`/api/app/subjects/${subject.id}/archive`, {
        method: "POST",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
      });

      const response = await call("/api/app/todos", {
        method: "POST",
        cookie: user.cookie,
        headers: { "idempotency-key": crypto.randomUUID() },
        body: { title: "Task", subjectId: subject.id },
      });
      expect(response.status).toBe(409);
      expect(errorOf(response)).toMatchObject({ code: "subject_archived" });
    });

    it("rejects a foreign or unknown subject with not_found", async () => {
      const user = await signUpUser();
      const foreign = await createSubject(await signUpUser(), "Other");
      for (const subjectId of [foreign.id, "00000000-0000-7000-8000-000000000000"]) {
        const response = await call("/api/app/todos", {
          method: "POST",
          cookie: user.cookie,
          headers: { "idempotency-key": crypto.randomUUID() },
          body: { title: "Task", subjectId },
        });
        expect(response.status, subjectId).toBe(404);
        expect(errorOf(response)).toMatchObject({ code: "not_found" });
      }
    });

    it("replays an idempotent create with the same key (EC-021)", async () => {
      const user = await signUpUser();
      const key = crypto.randomUUID();
      const first = await call("/api/app/todos", {
        method: "POST",
        cookie: user.cookie,
        headers: { "idempotency-key": key },
        body: { title: "One" },
      });
      expect(first.status).toBe(201);
      const replay = await call("/api/app/todos", {
        method: "POST",
        cookie: user.cookie,
        headers: { "idempotency-key": key },
        body: { title: "One" },
      });
      expect(replay.status).toBe(201);
      expect(replay.headers.get("idempotent-replay")).toBe("true");
      expect(replay.body).toEqual(first.body);
      expect(await listOf(user)).toMatchObject({ data: [{ title: "One" }] });
    });

    it("rejects a missing Idempotency-Key", async () => {
      const user = await signUpUser();
      const response = await call("/api/app/todos", {
        method: "POST",
        cookie: user.cookie,
        body: { title: "Task" },
      });
      expect(response.status).toBe(400);
      expect(errorOf(response)).toMatchObject({ code: "idempotency_key_required" });
    });
  });

  describe("TODO-01 list and filters", () => {
    it("orders by priority, then due date with null last, then age (FR-095, AC-FR-095-1..3)", async () => {
      const user = await signUpUser();
      await createTodo(user, { title: "low-tomorrow", priority: "low", dueDate: dayAfter(1) });
      await createTodo(user, { title: "high-null", priority: "high" });
      await createTodo(user, { title: "medium-may3", priority: "medium", dueDate: "2026-05-03" });
      await createTodo(user, { title: "medium-may1", priority: "medium", dueDate: "2026-05-01" });
      await createTodo(user, { title: "high-dated", priority: "high", dueDate: dayAfter(2) });

      const list = await listOf(user);
      expect(list.data.map((todo) => todo.title)).toEqual([
        "high-dated",
        "high-null",
        "medium-may1",
        "medium-may3",
        "low-tomorrow",
      ]);
      // The date the client sent must come back unchanged: a `date` column read through a
      // local-midnight Date would shift a positive-offset process back one day.
      expect(list.data.find((todo) => todo.title === "medium-may3")?.dueDate).toBe("2026-05-03");
      expect(list.page).toEqual({ nextCursor: null, hasMore: false });
    });

    it("lists done to-dos after open ones with status=all (FR-095)", async () => {
      const user = await signUpUser();
      const done = await createTodo(user, { title: "old-done", priority: "high" });
      await createTodo(user, { title: "open", priority: "high" });
      await complete(user, done.id, true);

      const all = await listOf(user, "?status=all");
      expect(all.data.map((todo) => todo.title)).toEqual(["open", "old-done"]);
      expect(all.data[1]).toMatchObject({ done: true, completedAt: expect.any(String) });
    });

    it("combines filters with AND (AC-FR-094-1, AC-FR-094-2)", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "Physics");
      await createTodo(user, { title: "high-physics", subjectId: subject.id, priority: "high" });
      await createTodo(user, { title: "low-physics", subjectId: subject.id, priority: "low" });
      await createTodo(user, { title: "high-other", priority: "high" });

      const bySubject = await listOf(user, `?subjectId=${subject.id}`);
      expect(bySubject.data.map((todo) => todo.title)).toEqual(["high-physics", "low-physics"]);

      const byPriority = await listOf(user, "?priority=high");
      expect(byPriority.data.map((todo) => todo.title)).toEqual(["high-physics", "high-other"]);

      const both = await listOf(user, `?subjectId=${subject.id}&priority=high`);
      expect(both.data.map((todo) => todo.title)).toEqual(["high-physics"]);
    });

    it("computes overdue, today, within7 and none against the profile zone (BR-030, AC-FR-094-3)", async () => {
      const user = await signUpUser();
      await createTodo(user, { title: "overdue", dueDate: dayAfter(-2) });
      await createTodo(user, { title: "today", dueDate: dayAfter(0) });
      await createTodo(user, { title: "in-5", dueDate: dayAfter(5) });
      await createTodo(user, { title: "in-7", dueDate: dayAfter(7) });
      await createTodo(user, { title: "in-8", dueDate: dayAfter(8) });
      await createTodo(user, { title: "none" });

      expect((await listOf(user, "?due=overdue")).data.map((todo) => todo.title)).toEqual(["overdue"]);
      expect((await listOf(user, "?due=today")).data.map((todo) => todo.title)).toEqual(["today"]);
      expect((await listOf(user, "?due=within7")).data.map((todo) => todo.title)).toEqual([
        "today",
        "in-5",
        "in-7",
      ]);

      // The derived flag on the row itself: overdue never matches a done to-do (FR-094).
      const done = await createTodo(user, { title: "done-overdue", dueDate: dayAfter(-2) });
      await complete(user, done.id, true);
      const allOverdue = await listOf(user, "?due=overdue&status=all");
      expect(allOverdue.data.map((todo) => todo.title)).toEqual(["overdue"]);
    });

    it("returns an empty match as an empty page (AC-FR-094-4)", async () => {
      const user = await signUpUser();
      await createTodo(user, { title: "low", priority: "low" });
      const list = await listOf(user, "?priority=high");
      expect(list).toEqual({ data: [], page: { nextCursor: null, hasMore: false } });
    });

    it("rejects unknown enum values with validation_failed", async () => {
      const user = await signUpUser();
      for (const query of ["?status=maybe", "?priority=urgent", "?due=soon"]) {
        const response = await call(`/api/app/todos${query}`, { cookie: user.cookie });
        expect(response.status, query).toBe(400);
        expect(errorOf(response)).toMatchObject({ code: "validation_failed" });
      }
      for (const query of ["?limit=0", "?limit=101"]) {
        const response = await call(`/api/app/todos${query}`, { cookie: user.cookie });
        expect(response.status, query).toBe(400);
        expect(errorOf(response)).toMatchObject({ code: "invalid_page_size" });
      }
    });

    it("answers an archived-subject filter with that subject's to-dos (FR-094 edge)", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "Geology");
      const todo = await createTodo(user, { title: "on-subject", subjectId: subject.id });
      await call(`/api/app/subjects/${subject.id}/archive`, {
        method: "POST",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
      });

      const list = await listOf(user, `?subjectId=${subject.id}`);
      expect(list.data.map((row) => row.id)).toEqual([todo.id]);
    });

    it("paginates with a cursor and a tampered cursor is invalid_cursor", async () => {
      const user = await signUpUser();
      for (let index = 0; index < 7; index += 1) {
        await createTodo(user, { title: `task-${index}`, priority: "high" });
      }
      const first = await listOf(user, "?limit=3");
      expect(first.data.map((todo) => todo.title)).toEqual(["task-0", "task-1", "task-2"]);
      expect(first.page.hasMore).toBe(true);
      expect(first.page.nextCursor).not.toBeNull();

      const second = await listOf(user, `?limit=3&cursor=${first.page.nextCursor}`);
      expect(second.data.map((todo) => todo.title)).toEqual(["task-3", "task-4", "task-5"]);
      expect(second.page.hasMore).toBe(true);

      const third = await listOf(user, `?limit=3&cursor=${second.page.nextCursor}`);
      expect(third.data.map((todo) => todo.title)).toEqual(["task-6"]);
      expect(third.page).toEqual({ nextCursor: null, hasMore: false });

      const tampered = await call(`/api/app/todos?cursor=not-a-cursor`, { cookie: user.cookie });
      expect(tampered.status).toBe(400);
      expect(errorOf(tampered)).toMatchObject({ code: "invalid_cursor" });
    });
  });

  describe("TODO-04 edit", () => {
    it("edits fields atomically and moves the row in the sort (AC-FR-091-1)", async () => {
      const user = await signUpUser();
      const todo = await createTodo(user, { title: "Medium task", priority: "medium" });
      const subject = await createSubject(user, "Biology");
      const topic = await createTopic(user, subject.id, "Cells");

      const edited = await call(`/api/app/todos/${todo.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": `"${todo.version}"` },
        body: { title: "High task", priority: "high", subjectId: subject.id, topicId: topic.id },
      });
      expect(edited.status, JSON.stringify(edited.body)).toBe(200);
      const updated = parseBody(todoSchema, edited, "PATCH todo");
      expect(updated).toMatchObject({
        title: "High task",
        priority: "high",
        subjectId: subject.id,
        topicId: topic.id,
        version: todo.version + 1,
      });

      const list = await listOf(user);
      expect(list.data[0]?.title).toBe("High task");
    });

    it("clears the due date with null and the subject with null also clears the topic (AC-FR-091-2)", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "Biology");
      const topic = await createTopic(user, subject.id, "Cells");
      const todo = await createTodo(user, {
        title: "Task",
        subjectId: subject.id,
        topicId: topic.id,
        dueDate: dayAfter(3),
      });

      const clearDue = await call(`/api/app/todos/${todo.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": `"${todo.version}"` },
        body: { dueDate: null },
      });
      expect(clearDue.status).toBe(200);
      expect(parseBody(todoSchema, clearDue, "PATCH clear due").dueDate).toBeNull();

      const clearSubject = await call(`/api/app/todos/${todo.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": '"2"' },
        body: { subjectId: null },
      });
      expect(clearSubject.status).toBe(200);
      expect(parseBody(todoSchema, clearSubject, "PATCH clear subject")).toMatchObject({
        subjectId: null,
        topicId: null,
      });
    });

    it("rejects a stale version with the current to-do (AC-FR-091-3, EC-020)", async () => {
      const user = await signUpUser();
      const todo = await createTodo(user, { title: "Original" });
      await complete(user, todo.id, true);

      const stale = await call(`/api/app/todos/${todo.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": `"${todo.version}"` },
        body: { title: "Stale write" },
      });
      expect(stale.status).toBe(409);
      const error = errorOf(stale);
      expect(error).toMatchObject({ code: "stale_version" });
      expect(error.details).toMatchObject({ current: { title: "Original", done: true } });
    });

    it("rejects a missing If-Match with version_required and rejects done on PATCH", async () => {
      const user = await signUpUser();
      const todo = await createTodo(user, { title: "Task" });

      const noMatch = await call(`/api/app/todos/${todo.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        body: { title: "Changed" },
      });
      expect(noMatch.status).toBe(400);
      expect(errorOf(noMatch)).toMatchObject({ code: "version_required" });

      const doneField = await call(`/api/app/todos/${todo.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
        body: { done: true },
      });
      expect(doneField.status).toBe(400);
      expect(errorOf(doneField)).toMatchObject({ code: "validation_failed" });
    });
  });

  describe("TODO-05 completion", () => {
    it("records and clears the completion time; a no-op changes nothing (AC-FR-093-1, AC-FR-093-2)", async () => {
      const user = await signUpUser();
      const todo = await createTodo(user, { title: "Task" });

      const done = await complete(user, todo.id, true);
      expect(done).toMatchObject({ done: true, version: 2 });
      expect(done.completedAt).not.toBeNull();

      const repeatDone = await complete(user, todo.id, true);
      expect(repeatDone).toMatchObject({ done: true, version: 2 });
      expect(repeatDone.completedAt).toBe(done.completedAt);

      const reopened = await complete(user, todo.id, false);
      expect(reopened).toMatchObject({ done: false, version: 3 });
      expect(reopened.completedAt).toBeNull();
    });

    it("publishes TodoCompleted exactly once, on the false-to-true transition (FR-172, EC-017)", async () => {
      const user = await signUpUser();
      const todo = await createTodo(user, { title: "Event task" });
      await complete(user, todo.id, true);
      await complete(user, todo.id, true);
      await complete(user, todo.id, false);
      await complete(user, todo.id, true);

      const mine = events.filter((event) => event.todoId === todo.id);
      expect(mine).toHaveLength(2);
      expect(mine[0]).toMatchObject({ type: "TodoCompleted", todoId: todo.id, userId: user.userId });
    });

    it("answers a missing or foreign to-do with not_found", async () => {
      const user = await signUpUser();
      const missing = await call("/api/app/todos/00000000-0000-7000-8000-000000000000/completion", {
        method: "PUT",
        cookie: user.cookie,
        body: { done: true },
      });
      expect(missing.status).toBe(404);
      expect(errorOf(missing)).toMatchObject({ code: "not_found" });
    });
  });

  describe("TODO-06 delete", () => {
    it("hard-deletes and a second delete is not_found (AC-FR-092-3)", async () => {
      const user = await signUpUser();
      const todo = await createTodo(user, { title: "Doomed" });

      const deleted = await call(`/api/app/todos/${todo.id}`, {
        method: "DELETE",
        cookie: user.cookie,
        headers: { "if-match": `"${todo.version}"` },
      });
      expect(deleted.status).toBe(204);
      expect(await listOf(user)).toEqual({ data: [], page: { nextCursor: null, hasMore: false } });

      const again = await call(`/api/app/todos/${todo.id}`, {
        method: "DELETE",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
      });
      expect(again.status).toBe(404);
      expect(errorOf(again)).toMatchObject({ code: "not_found" });
    });

    it("rejects a stale version with the current to-do", async () => {
      const user = await signUpUser();
      const todo = await createTodo(user, { title: "Keep" });
      await complete(user, todo.id, true);

      const stale = await call(`/api/app/todos/${todo.id}`, {
        method: "DELETE",
        cookie: user.cookie,
        headers: { "if-match": `"${todo.version}"` },
      });
      expect(stale.status).toBe(409);
      expect(errorOf(stale)).toMatchObject({ code: "stale_version" });
      expect(await listOf(user, "?status=all")).toMatchObject({ data: [{ title: "Keep", done: true }] });
    });
  });

  describe("ownership contract", () => {
    it("hides another user's to-do from every endpoint", async () => {
      const owner = await signUpUser();
      const actor = await signUpUser();
      const todo = await createTodo(owner, { title: "Private" });

      await expectHiddenFromOtherUser(actor, {
        label: "GET foreign todo",
        method: "GET",
        path: `/api/app/todos/${todo.id}`,
      });
      await expectHiddenFromOtherUser(actor, {
        label: "PATCH foreign todo",
        method: "PATCH",
        path: `/api/app/todos/${todo.id}`,
        body: { title: "Mine" },
        headers: { "if-match": `"${todo.version}"` },
      });
      await expectHiddenFromOtherUser(actor, {
        label: "DELETE foreign todo",
        method: "DELETE",
        path: `/api/app/todos/${todo.id}`,
        headers: { "if-match": `"${todo.version}"` },
      });
      await expectHiddenFromOtherUser(actor, {
        label: "PUT foreign completion",
        method: "PUT",
        path: `/api/app/todos/${todo.id}/completion`,
        body: { done: true },
      });
    });
  });

  describe("registry", () => {
    it("registers the tasks purge handler and export contributor with the owned groups", async () => {
      const user = await signUpUser();
      expect(purgeHandlers.keys()).toContain("tasks");
      expect(exportContributors.keys()).toContain("tasks");

      const todo = await createTodo(user, { title: "Purge me" });
      const purge = purgeHandlers.entries().find(([key]) => key === "tasks")?.[1];
      expect(await purge?.(user.userId)).toBe(1);
      expect(await database().query("SELECT 1 FROM todos WHERE id = $1", [todo.id])).toEqual([]);
      await createTodo(user, { title: "Export me" });
      const contributor = exportContributors.entries().find(([key]) => key === "tasks")?.[1];
      const section = (await contributor?.(user.userId)) as { section: string; rows: unknown[] };
      expect(section.section).toBe("tasks");
      expect(section.rows).toHaveLength(1);
      expect(section.rows[0]).toMatchObject({ title: "Export me" });
    });
  });
});
