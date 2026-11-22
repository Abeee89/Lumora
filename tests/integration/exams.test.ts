import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { exportContributors, purgeHandlers } from "@/kernel/registries";
import {
  call,
  database,
  errorEnvelopeSchema,
  examListSchema,
  examSchema,
  parseBody,
  signUpUser,
  subjectSchema,
  topicSchema,
  type ExamWire,
  type TestUser,
} from "./support/api";
import { startApiEnvironment, type ApiEnvironment } from "./support/environment";
import { expectHiddenFromOtherUser } from "./support/ownership";

/**
 * MILESTONES M04 acceptance for EXAM-01..EXAM-06: creation with the local-date rule and
 * idempotency, the upcoming/archived split with cursor pagination, If-Match editing with
 * the checklist-clear rule (AC-FR-121-4), the archived read-only rule (FR-125), the
 * checklist replace and toggle (FR-122, FR-123), EC-008, and the NFR-031 purge/export face.
 */
describe("exam endpoints", () => {
  let environment: ApiEnvironment;

  beforeAll(async () => {
    environment = await startApiEnvironment();
  }, 240_000);

  afterAll(async () => {
    await database().end();
    await environment?.stop();
  });

  const errorOf = (response: { body: unknown; status: number }) =>
    parseBody(errorEnvelopeSchema, response, "error");

  /** The integration DB runs in UTC and the profile timezone is UTC: today is UTC today. */
  const today = (): string => new Date().toISOString().slice(0, 10);

  const daysFromNow = (days: number): string => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  async function createSubject(user: TestUser, name: string): Promise<string> {
    const response = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name, color: "teal" },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(subjectSchema, response, "POST subject").id;
  }

  async function createTopic(user: TestUser, subjectId: string, name: string): Promise<string> {
    const response = await call(`/api/app/subjects/${subjectId}/topics`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(topicSchema, response, "POST topic").id;
  }

  async function createExam(
    user: TestUser,
    subjectId: string,
    title: string,
    examDate: string,
  ): Promise<ExamWire> {
    const response = await call("/api/app/exams", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { subjectId, title, examDate },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(examSchema, response, "POST /api/app/exams");
  }

  /** Creation rejects past dates (EC-013); an archived exam comes from editing the date back. */
  async function createArchivedExam(
    user: TestUser,
    subjectId: string,
    title: string,
    daysAgo: number,
  ): Promise<ExamWire> {
    const exam = await createExam(user, subjectId, title, daysFromNow(1));
    const response = await call(`/api/app/exams/${exam.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": `"${exam.version}"` },
      body: { examDate: daysFromNow(daysAgo) },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return parseBody(examSchema, response, "PATCH date into the past");
  }

  it("creates an exam with location, etag and countdown, and rejects a past date", async () => {
    const user = await signUpUser();
    const subjectId = await createSubject(user, "Algebra");

    const response = await call("/api/app/exams", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": "exam-create-1" },
      body: { subjectId, title: "Algebra finals", examDate: daysFromNow(7) },
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("etag")).toBe('"1"');
    const exam = parseBody(examSchema, response, "POST /api/app/exams");
    expect(response.headers.get("location")).toBe(`/api/app/exams/${exam.id}`);
    expect(exam).toMatchObject({ subjectId, title: "Algebra finals", state: "upcoming", version: 1 });
    expect(exam.countdown).toMatchObject({ daysRemaining: 7, isToday: false });
    expect(exam.checklist).toEqual([]);

    const past = await call("/api/app/exams", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { subjectId, title: "Too late", examDate: daysFromNow(-1) },
    });
    expect(past.status).toBe(400);
    expect(errorOf(past).code).toBe("exam_date_in_past");
  });

  it("rejects an archived subject and out-of-range titles", async () => {
    const user = await signUpUser();
    const subjectId = await createSubject(user, "Botany");
    const freshSubjectId = await createSubject(user, "Mycology");
    await call(`/api/app/subjects/${subjectId}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
    });

    const archived = await call("/api/app/exams", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { subjectId, title: "Nope", examDate: daysFromNow(3) },
    });
    expect(archived.status).toBe(409);
    expect(errorOf(archived).code).toBe("subject_archived");

    const long = await call("/api/app/exams", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { subjectId: freshSubjectId, title: "x".repeat(201), examDate: daysFromNow(3) },
    });
    expect(long.status).toBe(400);
  });

  it("replays a keyed create and rejects a reused key with a different payload", async () => {
    const user = await signUpUser();
    const subjectId = await createSubject(user, "Chemistry");

    const first = await call("/api/app/exams", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": "exam-key" },
      body: { subjectId, title: "Chem finals", examDate: daysFromNow(5) },
    });
    expect(first.status).toBe(201);
    const replay = await call("/api/app/exams", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": "exam-key" },
      body: { subjectId, title: "Chem finals", examDate: daysFromNow(5) },
    });
    expect(replay.status).toBe(201);
    expect(replay.headers.get("idempotent-replay")).toBe("true");
    expect(replay.body).toEqual(first.body);

    const reused = await call("/api/app/exams", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": "exam-key" },
      body: { subjectId, title: "Different", examDate: daysFromNow(5) },
    });
    expect(reused.status).toBe(409);
    expect(errorOf(reused).code).toBe("idempotency_key_reused");
  });

  it("lists upcoming first, archived last, and paginates the archived list", async () => {
    const user = await signUpUser();
    const subjectId = await createSubject(user, "Physics");

    await createExam(user, subjectId, "Early", daysFromNow(1));
    await createExam(user, subjectId, "Soon", daysFromNow(3));
    await createExam(user, subjectId, "Late", daysFromNow(30));
    await createArchivedExam(user, subjectId, "Past", -2);
    await createArchivedExam(user, subjectId, "Old", -20);

    const upcoming = await call("/api/app/exams?state=upcoming", { cookie: user.cookie });
    expect(upcoming.status).toBe(200);
    const upcomingList = parseBody(examListSchema, upcoming, "GET upcoming");
    expect(upcomingList.data.map((row) => row.title)).toEqual(["Early", "Soon", "Late"]);
    expect(upcomingList.data[0]?.countdown?.daysRemaining).toBe(1);
    expect(upcomingList.page).toEqual({ nextCursor: null, hasMore: false });
    expect(upcomingList.data[0]?.topicCount).toBe(0);

    const todayExam = await createExam(user, subjectId, "Today", today());
    const withToday = await call("/api/app/exams?state=upcoming", { cookie: user.cookie });
    const rows = parseBody(examListSchema, withToday, "GET upcoming").data;
    expect(rows.find((row) => row.id === todayExam.id)?.countdown?.isToday).toBe(true);

    const archived = await call("/api/app/exams?state=archived&limit=1", { cookie: user.cookie });
    expect(archived.status).toBe(200);
    const archivedPage = parseBody(examListSchema, archived, "GET archived");
    expect(archivedPage.data.map((row) => row.title)).toEqual(["Past"]);
    expect(archivedPage.data[0]?.state).toBe("archived");
    expect(archivedPage.data[0]?.countdown).toBeNull();
    expect(archivedPage.page.hasMore).toBe(true);
    expect(archivedPage.page.nextCursor).not.toBeNull();

    const next = await call(
      `/api/app/exams?state=archived&limit=1&cursor=${encodeURIComponent(archivedPage.page.nextCursor ?? "")}`,
      { cookie: user.cookie },
    );
    const secondPage = parseBody(examListSchema, next, "GET archived next");
    expect(secondPage.data.map((row) => row.title)).toEqual(["Old"]);
    expect(secondPage.page.hasMore).toBe(false);
  });

  it("answers the list counts as numbers, not the driver's bigint strings", async () => {
    const user = await signUpUser();
    const subjectId = await createSubject(user, "Geography");
    const first = await createTopic(user, subjectId, "Rivers");
    await createTopic(user, subjectId, "Mountains");
    const exam = await createExam(user, subjectId, "Physical geography", daysFromNow(4));
    await call(`/api/app/exams/${exam.id}/topics`, {
      method: "PUT",
      cookie: user.cookie,
      body: { topicIds: [first] },
    });
    await call(`/api/app/exams/${exam.id}/topics/${first}`, {
      method: "PUT",
      cookie: user.cookie,
      body: { completed: true },
    });

    const listed = await call("/api/app/exams?state=upcoming", { cookie: user.cookie });
    const row = parseBody(examListSchema, listed, "GET upcoming").data.find((item) => item.id === exam.id);
    expect(typeof row?.topicCount).toBe("number");
    expect(typeof row?.completedCount).toBe("number");
    expect(row?.topicCount).toBe(1);
    expect(row?.completedCount).toBe(1);
  });

  it("rejects limit or cursor on the upcoming list and bad page sizes", async () => {
    const user = await signUpUser();
    const limited = await call("/api/app/exams?state=upcoming&limit=10", { cookie: user.cookie });
    expect(limited.status).toBe(400);
    expect(errorOf(limited).code).toBe("validation_failed");

    const oversized = await call("/api/app/exams?state=archived&limit=101", { cookie: user.cookie });
    expect(oversized.status).toBe(400);
    expect(errorOf(oversized).code).toBe("invalid_page_size");

    const tampered = await call("/api/app/exams?state=archived&cursor=abc", { cookie: user.cookie });
    expect(tampered.status).toBe(400);
    expect(errorOf(tampered).code).toBe("invalid_cursor");
  });

  it("patches with If-Match, clears the checklist on subject change, and reports stale", async () => {
    const user = await signUpUser();
    const subjectId = await createSubject(user, "Biology");
    const otherSubjectId = await createSubject(user, "Genetics");
    const exam = await createExam(user, subjectId, "Bio finals", daysFromNow(9));

    const patched = await call(`/api/app/exams/${exam.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { title: "Bio finals v2", examDate: daysFromNow(10) },
    });
    expect(patched.status).toBe(200);
    const after = parseBody(examSchema, patched, "PATCH exam");
    expect(after).toMatchObject({ title: "Bio finals v2", version: 2 });
    expect(patched.headers.get("etag")).toBe('"2"');

    const stale = await call(`/api/app/exams/${exam.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { title: "Too old" },
    });
    expect(stale.status).toBe(409);
    expect(errorOf(stale).code).toBe("stale_version");

    const moved = await call(`/api/app/exams/${exam.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"2"' },
      body: { subjectId: otherSubjectId },
    });
    expect(moved.status).toBe(200);
    expect(parseBody(examSchema, moved, "PATCH moved").subjectId).toBe(otherSubjectId);
  });

  it("replaces and toggles the checklist and rejects foreign topics", async () => {
    const user = await signUpUser();
    const subjectId = await createSubject(user, "French");
    const topicA = await createTopic(user, subjectId, "Vocabulary");
    const topicB = await createTopic(user, subjectId, "Grammar");

    const exam = await createExam(user, subjectId, "French exam", daysFromNow(6));

    const replaced = await call(`/api/app/exams/${exam.id}/topics`, {
      method: "PUT",
      cookie: user.cookie,
      body: { topicIds: [topicA, topicB] },
    });
    expect(replaced.status).toBe(200);
    const withTopics = parseBody(examSchema, replaced, "PUT topics");
    expect(withTopics.checklist.map((item) => item.topicId)).toEqual([topicA, topicB]);
    expect(withTopics.checklist.every((item) => !item.completed)).toBe(true);

    const toggled = await call(`/api/app/exams/${exam.id}/topics/${topicA}`, {
      method: "PUT",
      cookie: user.cookie,
      body: { completed: true },
    });
    expect(toggled.status).toBe(200);
    const done = parseBody(examSchema, toggled, "PUT topic");
    expect(done.checklist.find((item) => item.topicId === topicA)?.completed).toBe(true);

    const foreign = await call(`/api/app/exams/${exam.id}/topics`, {
      method: "PUT",
      cookie: user.cookie,
      body: { topicIds: ["00000000-0000-0000-0000-000000000000"] },
    });
    expect(foreign.status).toBe(400);

    const emptied = await call(`/api/app/exams/${exam.id}/topics`, {
      method: "PUT",
      cookie: user.cookie,
      body: { topicIds: [] },
    });
    expect(emptied.status).toBe(200);
    expect(parseBody(examSchema, emptied, "PUT empty").checklist).toEqual([]);
  });

  it("drops a checklist row when its topic is archived (EC-008)", async () => {
    const user = await signUpUser();
    const subjectId = await createSubject(user, "Economics");
    const topic = await createTopic(user, subjectId, "Macro");
    const exam = await createExam(user, subjectId, "Econ finals", daysFromNow(11));

    await call(`/api/app/exams/${exam.id}/topics`, {
      method: "PUT",
      cookie: user.cookie,
      body: { topicIds: [topic] },
    });

    const archived = await call(`/api/app/topics/${topic}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
    });
    expect(archived.status).toBe(200);

    const read = await call(`/api/app/exams/${exam.id}`, { cookie: user.cookie });
    expect(parseBody(examSchema, read, "GET exam").checklist).toEqual([]);
  });

  it("keeps an archived exam read-only except the date, and restores it with a later date", async () => {
    const user = await signUpUser();
    const subjectId = await createSubject(user, "History");
    const topic = await createTopic(user, subjectId, "Chapter 1");
    const exam = await createArchivedExam(user, subjectId, "History final", -3);

    const renamed = await call(`/api/app/exams/${exam.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": `"${exam.version}"` },
      body: { title: "Renamed" },
    });
    expect(renamed.status).toBe(400);
    expect(errorOf(renamed).code).toBe("validation_failed");

    const toggled = await call(`/api/app/exams/${exam.id}/topics/${topic}`, {
      method: "PUT",
      cookie: user.cookie,
      body: { completed: true },
    });
    expect(toggled.status).toBe(400);

    const moved = await call(`/api/app/exams/${exam.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": `"${exam.version}"` },
      body: { examDate: daysFromNow(2) },
    });
    expect(moved.status).toBe(200);
    expect(parseBody(examSchema, moved, "PATCH date").state).toBe("upcoming");
  });

  it("answers not_found for malformed, unknown and foreign exam ids", async () => {
    const user = await signUpUser();
    const stranger = await signUpUser();
    const subjectId = await createSubject(user, "Music");
    const exam = await createExam(user, subjectId, "Music exam", daysFromNow(4));

    const malformed = await call("/api/app/exams/not-a-uuid", { cookie: user.cookie });
    expect(malformed.status).toBe(404);

    const unknown = await call("/api/app/exams/00000000-0000-0000-0000-000000000000", {
      cookie: user.cookie,
    });
    expect(unknown.status).toBe(404);

    await expectHiddenFromOtherUser(stranger, {
      label: "GET /api/app/exams/{id}",
      method: "GET",
      path: `/api/app/exams/${exam.id}`,
    });
    await expectHiddenFromOtherUser(stranger, {
      label: "PATCH /api/app/exams/{id}",
      method: "PATCH",
      path: `/api/app/exams/${exam.id}`,
      headers: { "if-match": `"${exam.version}"` },
      body: { title: "Stolen" },
    });
  });

  it("purges exams before topics and exports them (NFR-031)", async () => {
    const user = await signUpUser();
    const subjectId = await createSubject(user, "Statistics");
    const topic = await createTopic(user, subjectId, "Distributions");
    const exam = await createExam(user, subjectId, "Stats final", daysFromNow(14));
    await call(`/api/app/exams/${exam.id}/topics`, {
      method: "PUT",
      cookie: user.cookie,
      body: { topicIds: [topic] },
    });

    const contributor = (key: string) => exportContributors.entries().find(([name]) => name === key)?.[1];
    const examsSection = (await contributor("exams")?.(user.userId)) as {
      section: string;
      rows: unknown[];
    };
    expect(examsSection.section).toBe("exams");
    expect(examsSection.rows).toHaveLength(1);
    // `exam_date` is a calendar date: the export carries it as text, never as a timestamp
    // shifted by the timezone of whatever process wrote the file.
    expect(examsSection.rows[0]).toMatchObject({ exam_date: daysFromNow(14), title: "Stats final" });

    // Registration order is the purge order; exams must precede topics because
    // exam_topics -> topics is NO ACTION (EC-008 keeps archived topics).
    const handlers = purgeHandlers.entries();
    const keys = handlers.map(([key]) => key);
    expect(keys.indexOf("exams")).toBeLessThan(keys.indexOf("topics"));
    for (const [, handler] of handlers) {
      await handler(user.userId);
    }
    expect(await database().query("SELECT id FROM exams WHERE user_id = $1", [user.userId])).toEqual([]);
    expect(
      await database().query("SELECT exam_id FROM exam_topics WHERE exam_id = $1", [exam.id]),
    ).toEqual([]);
  });
});