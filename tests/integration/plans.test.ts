import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { exportContributors, purgeHandlers } from "@/kernel/registries";
import {
  call,
  database,
  errorEnvelopeSchema,
  parseBody,
  planEntryListSchema,
  planEntrySchema,
  planEntryWrittenSchema,
  signUpUser,
  subjectSchema,
  topicSchema,
  type PlanEntryWire,
  type TestUser,
} from "./support/api";
import { startApiEnvironment, type ApiEnvironment } from "./support/environment";
import { expectHiddenFromOtherUser } from "./support/ownership";

/**
 * MILESTONES M05 acceptance for PLAN-01..PLAN-06: the future-only create with idempotency,
 * both advisories and their confirmation (BR-026, FR-038), the range read with the 93-day
 * bound and archived subjects hidden (FR-037, EC-007), If-Match editing and its read-only
 * rule (BR-028), the hard delete (FR-032) and the missed mark (FR-033).
 */
describe("plan endpoints", () => {
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

  const dayAfter = (days: number): string => {
    const date = new Date(`${today()}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  /** An instant `days` ahead at `hourUtc`:00, always later than the run's own clock. */
  const at = (days: number, hourUtc: number): string => `${dayAfter(days)}T${String(hourUtc).padStart(2, "0")}:00:00.000Z`;

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

  const postEntry = (user: TestUser, body: Record<string, unknown>, key?: string) =>
    call("/api/app/plan-entries", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": key ?? crypto.randomUUID() },
      body,
    });

  async function createEntry(
    user: TestUser,
    body: Record<string, unknown>,
  ): Promise<PlanEntryWire> {
    const response = await postEntry(user, body);
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(planEntryWrittenSchema, response, "POST /api/app/plan-entries");
  }

  /** Archives a subject the test just created, so the version is always 1. */
  async function archiveSubject(user: TestUser, subjectId: string): Promise<void> {
    const response = await call(`/api/app/subjects/${subjectId}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
  }

  /** A past entry can only be produced by moving an existing row: creation rejects it. */
  async function backdate(entryId: string, hours: number): Promise<void> {
    await database().query(
      `UPDATE plan_entries
       SET starts_at = now() - make_interval(hours => $2), local_date = (now() - make_interval(hours => $2))::date
       WHERE id = $1`,
      [entryId, hours],
    );
  }

  describe("PLAN-02 create", () => {
    it("answers 201 with Location, ETag and the frozen local date", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const topicId = await createTopic(user, subjectId, "Quadratics");
      const startsAt = at(1, 9);

      const response = await postEntry(user, { subjectId, topicId, startsAt, durationMin: 45 });
      expect(response.status, JSON.stringify(response.body)).toBe(201);

      const entry = parseBody(planEntryWrittenSchema, response, "POST plan entry");
      expect(entry).toMatchObject({
        subjectId,
        topicId,
        durationMin: 45,
        plannedMin: 45,
        timezone: "UTC",
        localDate: dayAfter(1),
        status: "upcoming",
        missedAt: null,
        version: 1,
      });
      expect(entry.startsAt).toBe(startsAt);
      expect(entry.warnings).toEqual([]);
      expect(response.headers.get("etag")).toBe('"1"');
      expect(response.headers.get("location")).toBe(`/api/app/plan-entries/${entry.id}`);

      // The read answers the 13 documented fields only: the schema is strict, so a leaked
      // `warnings` key or an M06 actual-time field would fail here.
      const read = await call(`/api/app/plan-entries/${entry.id}`, { cookie: user.cookie });
      expect(read.status).toBe(200);
      const fields: Record<string, unknown> = { ...entry };
      delete fields["warnings"];
      expect(parseBody(planEntrySchema, read, "GET plan entry")).toEqual(fields);
    });

    it("refuses a start that has already passed (AC-FR-030-4)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Physics");
      const response = await postEntry(user, {
        subjectId,
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        durationMin: 30,
      });
      expect(response.status).toBe(400);
      expect(errorOf(response)).toMatchObject({
        code: "validation_failed",
        details: { fields: [{ path: "startsAt", rule: "future" }] },
      });
    });

    it("keeps the duration inside 5..480 minutes", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Chemistry");
      for (const durationMin of [4, 481]) {
        const response = await postEntry(user, { subjectId, startsAt: at(1, 9), durationMin });
        expect(response.status).toBe(400);
        expect(errorOf(response)).toMatchObject({
          code: "duration_out_of_range",
          details: { min: 5, max: 480 },
        });
      }
    });

    it("requires a topic of the entry's own subject", async () => {
      const user = await signUpUser();
      const first = await createSubject(user, "Biology");
      const second = await createSubject(user, "History");
      const foreignTopic = await createTopic(user, second, "Rome");

      const response = await postEntry(user, {
        subjectId: first,
        topicId: foreignTopic,
        startsAt: at(1, 9),
        durationMin: 30,
      });
      expect(response.status).toBe(400);
      expect(errorOf(response)).toMatchObject({
        code: "validation_failed",
        details: { fields: [{ path: "topicId", rule: "member_of_subject" }] },
      });
    });

    it("refuses an archived subject", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Old subject");
      await archiveSubject(user, subjectId);

      const response = await postEntry(user, { subjectId, startsAt: at(1, 9), durationMin: 30 });
      expect(response.status).toBe(409);
      expect(errorOf(response).code).toBe("subject_archived");
    });

    it("replays a keyed create and rejects a reused key with another body", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Geography");
      const key = crypto.randomUUID();
      const body = { subjectId, startsAt: at(1, 9), durationMin: 30 };

      const first = await postEntry(user, body, key);
      expect(first.status).toBe(201);
      const replay = await postEntry(user, body, key);
      expect(replay.status).toBe(201);
      expect(replay.headers.get("idempotent-replay")).toBe("true");
      expect(replay.body).toEqual(first.body);

      const reused = await postEntry(user, { ...body, durationMin: 60 }, key);
      expect(reused.status).toBe(409);
      expect(errorOf(reused).code).toBe("idempotency_key_reused");
    });
  });

  describe("warnings (BR-026, FR-038)", () => {
    it("refuses an overlap until it is confirmed, and touching intervals do not overlap", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const first = await createEntry(user, { subjectId, startsAt: at(2, 10), durationMin: 60 });

      const overlapping = await postEntry(user, {
        subjectId,
        startsAt: at(2, 10),
        durationMin: 30,
      });
      expect(overlapping.status).toBe(409);
      const failure = errorOf(overlapping);
      expect(failure.code).toBe("overlap_confirmation_required");
      expect(failure.details).toMatchObject({
        warnings: [
          {
            code: "overlap",
            planEntryId: first.id,
            subjectId,
            startsAt: at(2, 10),
            durationMin: 60,
          },
        ],
      });

      const confirmed = await postEntry(user, {
        subjectId,
        startsAt: at(2, 10),
        durationMin: 30,
        confirmedWarnings: ["overlap"],
      });
      expect(confirmed.status, JSON.stringify(confirmed.body)).toBe(201);
      const saved = parseBody(planEntryWrittenSchema, confirmed, "confirmed overlap");
      expect(saved.warnings).toHaveLength(1);
      expect(saved.warnings[0]).toMatchObject({ code: "overlap", planEntryId: first.id });

      // AC-FR-034-3: an interval that starts where the other ends does not overlap.
      const touching = await postEntry(user, {
        subjectId,
        startsAt: at(2, 11),
        durationMin: 60,
      });
      expect(touching.status, JSON.stringify(touching.body)).toBe(201);
      expect(parseBody(planEntryWrittenSchema, touching, "touching entry").warnings).toEqual([]);
    });

    it("warns when the entry is planned after an upcoming exam date", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const exam = await call("/api/app/exams", {
        method: "POST",
        cookie: user.cookie,
        headers: { "idempotency-key": crypto.randomUUID() },
        body: { subjectId, title: "Midterm", examDate: dayAfter(1) },
      });
      expect(exam.status, JSON.stringify(exam.body)).toBe(201);
      const examId = (exam.body as { id: string }).id;

      const refused = await postEntry(user, { subjectId, startsAt: at(3, 9), durationMin: 60 });
      expect(refused.status).toBe(409);
      expect(errorOf(refused)).toMatchObject({
        code: "exam_date_warning_confirmation_required",
        details: { warnings: [{ code: "exam_date", examId, examDate: dayAfter(1) }] },
      });

      const confirmed = await postEntry(user, {
        subjectId,
        startsAt: at(3, 9),
        durationMin: 60,
        confirmedWarnings: ["exam_date"],
      });
      expect(confirmed.status, JSON.stringify(confirmed.body)).toBe(201);
      expect(parseBody(planEntryWrittenSchema, confirmed, "confirmed exam").warnings).toEqual([
        { code: "exam_date", examId, examDate: dayAfter(1) },
      ]);

      // An entry before the exam date is never warned about.
      const before = await postEntry(user, { subjectId, startsAt: at(1, 9), durationMin: 60 });
      expect(before.status, JSON.stringify(before.body)).toBe(201);
    });

    it("reports the overlap code first and both warnings together", async () => {
      const user = await signUpUser();
      const planned = await createSubject(user, "Algebra");
      const examined = await createSubject(user, "Chemistry");
      const exam = await call("/api/app/exams", {
        method: "POST",
        cookie: user.cookie,
        headers: { "idempotency-key": crypto.randomUUID() },
        body: { subjectId: examined, title: "Final", examDate: dayAfter(1) },
      });
      expect(exam.status, JSON.stringify(exam.body)).toBe(201);
      const earlier = await createEntry(user, {
        subjectId: planned,
        startsAt: at(3, 10),
        durationMin: 60,
      });

      const both = await postEntry(user, {
        subjectId: examined,
        startsAt: at(3, 10),
        durationMin: 30,
      });
      expect(both.status).toBe(409);
      expect(errorOf(both).code).toBe("overlap_confirmation_required");
      expect(errorOf(both).details).toMatchObject({
        warnings: [
          { code: "overlap", planEntryId: earlier.id },
          { code: "exam_date", examId: (exam.body as { id: string }).id },
        ],
      });

      const half = await postEntry(user, {
        subjectId: examined,
        startsAt: at(3, 10),
        durationMin: 30,
        confirmedWarnings: ["overlap"],
      });
      expect(half.status).toBe(409);
      expect(errorOf(half).code).toBe("exam_date_warning_confirmation_required");
      expect(errorOf(half).details).toMatchObject({
        warnings: [{ code: "exam_date" }],
      });

      const done = await postEntry(user, {
        subjectId: examined,
        startsAt: at(3, 10),
        durationMin: 30,
        confirmedWarnings: ["overlap", "exam_date"],
      });
      expect(done.status, JSON.stringify(done.body)).toBe(201);
      expect(parseBody(planEntryWrittenSchema, done, "both confirmed").warnings).toHaveLength(2);
    });

    it("rejects a warning code the schema does not know", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const response = await postEntry(user, {
        subjectId,
        startsAt: at(1, 9),
        durationMin: 30,
        confirmedWarnings: ["holiday"],
      });
      expect(response.status).toBe(400);
      expect(errorOf(response).code).toBe("validation_failed");
    });
  });

  describe("PLAN-01 list (FR-037)", () => {
      it("filters by range, subject and status, and hides archived subjects (EC-007)", async () => {
        const user = await signUpUser();
        const algebra = await createSubject(user, "Algebra");
        const history = await createSubject(user, "History");
        const inside = await createEntry(user, {
          subjectId: algebra,
          startsAt: at(1, 9),
          durationMin: 30,
        });
        const other = await createEntry(user, {
          subjectId: history,
          startsAt: at(2, 9),
          durationMin: 45,
        });
        const outside = await createEntry(user, {
          subjectId: algebra,
          startsAt: at(9, 9),
          durationMin: 30,
        });

        const all = await call(`/api/app/plan-entries?from=${today()}&to=${dayAfter(3)}`, {
          cookie: user.cookie,
        });
        expect(all.status).toBe(200);
        expect(parseBody(planEntryListSchema, all, "range").data.map((row) => row.id)).toEqual([
          inside.id,
          other.id,
        ]);

        const filtered = await call(
          `/api/app/plan-entries?from=${today()}&to=${dayAfter(10)}&subjectId=${algebra}&status=upcoming`,
          { cookie: user.cookie },
        );
        expect(
          parseBody(planEntryListSchema, filtered, "subject filter").data.map((row) => row.id),
        ).toEqual([inside.id, outside.id]);

        await archiveSubject(user, history);
        const hidden = await call(`/api/app/plan-entries?from=${today()}&to=${dayAfter(3)}`, {
          cookie: user.cookie,
        });
        expect(
          parseBody(planEntryListSchema, hidden, "archived hidden").data.map((row) => row.id),
        ).toEqual([inside.id]);
      });

      it("bounds the range to 93 days and rejects a reversed one", async () => {
        const user = await signUpUser();
        const longest = await call(`/api/app/plan-entries?from=${today()}&to=${dayAfter(92)}`, {
          cookie: user.cookie,
        });
        expect(longest.status).toBe(200);

        const tooLong = await call(`/api/app/plan-entries?from=${today()}&to=${dayAfter(93)}`, {
          cookie: user.cookie,
        });
        expect(tooLong.status).toBe(400);
        expect(errorOf(tooLong)).toMatchObject({
          code: "invalid_date_range",
          details: { maxSpan: "93 days" },
        });

        const reversed = await call(
          `/api/app/plan-entries?from=${dayAfter(2)}&to=${dayAfter(1)}`,
          { cookie: user.cookie },
        );
        expect(reversed.status).toBe(400);
        expect(errorOf(reversed).code).toBe("invalid_date_range");
      });

      it("freezes the profile zone's local date at create (BR-030, EC-006)", async () => {
        const user = await signUpUser({ timezone: "America/New_York" });
        const subjectId = await createSubject(user, "Algebra");
        // 02:00Z tomorrow is 22:00 in New York tonight: the local date is the earlier day.
        const entry = await createEntry(user, { subjectId, startsAt: at(1, 2), durationMin: 30 });
        expect(entry.timezone).toBe("America/New_York");
        expect(entry.localDate).toBe(dayAfter(0));

        const listed = await call(`/api/app/plan-entries?from=${dayAfter(0)}&to=${dayAfter(1)}`, {
          cookie: user.cookie,
        });
        expect(parseBody(planEntryListSchema, listed, "ny range").data.map((row) => row.id)).toEqual([
          entry.id,
        ]);
      });
    });

    describe("PLAN-04 edit (BR-028)", () => {
      it("requires If-Match and answers a stale version with the current entry", async () => {
        const user = await signUpUser();
        const subjectId = await createSubject(user, "Algebra");
        const entry = await createEntry(user, { subjectId, startsAt: at(1, 9), durationMin: 30 });

        const missing = await call(`/api/app/plan-entries/${entry.id}`, {
          method: "PATCH",
          cookie: user.cookie,
          body: { durationMin: 45 },
        });
        expect(missing.status).toBe(400);
        expect(errorOf(missing).code).toBe("version_required");

        const edited = await call(`/api/app/plan-entries/${entry.id}`, {
          method: "PATCH",
          cookie: user.cookie,
          headers: { "if-match": '"1"' },
          body: { durationMin: 45 },
        });
        expect(edited.status, JSON.stringify(edited.body)).toBe(200);
        const saved = parseBody(planEntryWrittenSchema, edited, "PATCH plan entry");
        expect(saved).toMatchObject({ durationMin: 45, plannedMin: 45, version: 2 });
        expect(saved.warnings).toEqual([]);
        expect(edited.headers.get("etag")).toBe('"2"');

        const stale = await call(`/api/app/plan-entries/${entry.id}`, {
          method: "PATCH",
          cookie: user.cookie,
          headers: { "if-match": '"1"' },
          body: { durationMin: 60 },
        });
        expect(stale.status).toBe(409);
        expect(errorOf(stale)).toMatchObject({
          code: "stale_version",
          details: { current: { id: entry.id, version: 2, durationMin: 45 } },
        });
      });

      it("re-freezes the local date when the start moves", async () => {
        const user = await signUpUser({ timezone: "America/New_York" });
        const subjectId = await createSubject(user, "Algebra");
        const entry = await createEntry(user, {
          subjectId,
          startsAt: at(1, 2),
          durationMin: 30,
        });

        const moved = await call(`/api/app/plan-entries/${entry.id}`, {
          method: "PATCH",
          cookie: user.cookie,
          headers: { "if-match": '"1"' },
          body: { startsAt: at(2, 2) },
        });
        expect(moved.status, JSON.stringify(moved.body)).toBe(200);
        expect(parseBody(planEntryWrittenSchema, moved, "moved entry").localDate).toBe(dayAfter(1));
      });

      it("refuses an entry that has already started", async () => {
        const user = await signUpUser();
        const subjectId = await createSubject(user, "Algebra");
        const entry = await createEntry(user, { subjectId, startsAt: at(1, 9), durationMin: 30 });
        await backdate(entry.id, 2);

        const response = await call(`/api/app/plan-entries/${entry.id}`, {
          method: "PATCH",
          cookie: user.cookie,
          headers: { "if-match": '"1"' },
          body: { durationMin: 60 },
        });
        expect(response.status).toBe(409);
        expect(errorOf(response).code).toBe("past_entry_read_only");
      });
    });

    describe("PLAN-05 delete and PLAN-06 missed (FR-032, FR-033)", () => {
      it("deletes on the matching version and then answers 404", async () => {
        const user = await signUpUser();
        const subjectId = await createSubject(user, "Algebra");
        const entry = await createEntry(user, { subjectId, startsAt: at(1, 9), durationMin: 30 });

        const deleted = await call(`/api/app/plan-entries/${entry.id}`, {
          method: "DELETE",
          cookie: user.cookie,
          headers: { "if-match": '"1"' },
        });
        expect(deleted.status).toBe(204);

        const gone = await call(`/api/app/plan-entries/${entry.id}`, {
          method: "DELETE",
          cookie: user.cookie,
          headers: { "if-match": '"1"' },
        });
        expect(gone.status).toBe(404);
        expect(errorOf(gone).code).toBe("not_found");
      });

      it("marks an entry that has started as missed, once", async () => {
        const user = await signUpUser();
        const subjectId = await createSubject(user, "Algebra");
        const entry = await createEntry(user, { subjectId, startsAt: at(1, 9), durationMin: 30 });

        const early = await call(`/api/app/plan-entries/${entry.id}/missed`, {
          method: "POST",
          cookie: user.cookie,
          headers: { "if-match": '"1"' },
        });
        expect(early.status).toBe(400);
        expect(errorOf(early)).toMatchObject({
          code: "validation_failed",
          details: { fields: [{ path: "body", rule: "not_started_yet" }] },
        });

        await backdate(entry.id, 3);
        const marked = await call(`/api/app/plan-entries/${entry.id}/missed`, {
          method: "POST",
          cookie: user.cookie,
          headers: { "if-match": '"1"' },
        });
        expect(marked.status, JSON.stringify(marked.body)).toBe(200);
        const missed = parseBody(planEntrySchema, marked, "missed entry");
        expect(missed).toMatchObject({ status: "missed", version: 2 });
        expect(missed.missedAt).not.toBeNull();

        const again = await call(`/api/app/plan-entries/${entry.id}/missed`, {
          method: "POST",
          cookie: user.cookie,
          headers: { "if-match": '"2"' },
        });
        expect(again.status).toBe(200);
        expect(parseBody(planEntrySchema, again, "missed again")).toMatchObject({
          status: "missed",
          version: 2,
          missedAt: missed.missedAt,
        });

        const filtered = await call(
          `/api/app/plan-entries?from=${dayAfter(0)}&to=${dayAfter(2)}&status=missed`,
          { cookie: user.cookie },
        );
        expect(
          parseBody(planEntryListSchema, filtered, "missed filter").data.map((row) => row.id),
        ).toEqual([entry.id]);
      });
    });

    describe("ownership and the NFR-031 face", () => {
      it("hides another user's entry from every endpoint", async () => {
        const owner = await signUpUser();
        const actor = await signUpUser();
        const subjectId = await createSubject(owner, "Algebra");
        const entry = await createEntry(owner, { subjectId, startsAt: at(1, 9), durationMin: 30 });

        await expectHiddenFromOtherUser(actor, {
          label: "GET plan entry",
          method: "GET",
          path: `/api/app/plan-entries/${entry.id}`,
        });
        await expectHiddenFromOtherUser(actor, {
          label: "PATCH plan entry",
          method: "PATCH",
          path: `/api/app/plan-entries/${entry.id}`,
          body: { durationMin: 60 },
          headers: { "if-match": '"1"' },
        });
        await expectHiddenFromOtherUser(actor, {
          label: "DELETE plan entry",
          method: "DELETE",
          path: `/api/app/plan-entries/${entry.id}`,
          headers: { "if-match": '"1"' },
        });
        await expectHiddenFromOtherUser(actor, {
          label: "POST plan entry missed",
          method: "POST",
          path: `/api/app/plan-entries/${entry.id}/missed`,
          headers: { "if-match": '"1"' },
        });
        await expectHiddenFromOtherUser(actor, {
          label: "POST plan entry with a foreign subject",
          method: "POST",
          path: "/api/app/plan-entries",
          body: { subjectId, startsAt: at(1, 9), durationMin: 30 },
          headers: { "idempotency-key": crypto.randomUUID() },
        });

        const mine = await call(`/api/app/plan-entries?from=${today()}&to=${dayAfter(2)}`, {
          cookie: actor.cookie,
        });
        expect(parseBody(planEntryListSchema, mine, "actor range").data).toEqual([]);
      });

      it("purges and exports the plans group", async () => {
        const user = await signUpUser();
        const subjectId = await createSubject(user, "Algebra");
        const entry = await createEntry(user, {
          subjectId,
          startsAt: at(1, 9),
          durationMin: 45,
        });

        const contributor = exportContributors.entries().find(([key]) => key === "plans")?.[1];
        const section = (await contributor?.(user.userId)) as {
          section: string;
          rows: Record<string, unknown>[];
        };
        expect(section.section).toBe("plans");
        expect(section.rows).toHaveLength(1);
        expect(section.rows[0]).toMatchObject({
          id: entry.id,
          subject_id: subjectId,
          duration_min: 45,
          timezone: "UTC",
          local_date: dayAfter(1),
          missed_at: null,
        });

        const purge = purgeHandlers.entries().find(([key]) => key === "plans")?.[1];
        expect(await purge?.(user.userId)).toBe(1);
        expect(
          await database().query("SELECT 1 FROM plan_entries WHERE user_id = $1", [user.userId]),
        ).toEqual([]);
      });
    });
});