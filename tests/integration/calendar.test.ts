import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  call,
  calendarDayDetailSchema,
  calendarMonthSchema,
  database,
  parseBody,
  planEntryWrittenSchema,
  sessionSchema,
  signUpUser,
  subjectSchema,
  type CalendarDayDetailWire,
  type CalendarMonthWire,
  type PlanEntryWire,
  type SessionWire,
  type SubjectWire,
  type TestUser,
} from "./support/api";
import { startApiEnvironment, type ApiEnvironment } from "./support/environment";

/**
 * MILESTONES M09 acceptance for CAL-01 and CAL-02 (FR-060..FR-062): the four intensity
 * buckets of AC-FR-060-1 with the minute figure always present (AC-FR-060-2), zero-filled
 * months, the day total over the frozen local dates (AC-FR-061-1, AC-FR-061-4, AC-E2E-05),
 * a session split across midnight (AC-FR-061-2, EC-009), the archived-subject label
 * (AC-FR-061-3), plan entries with the derived status (AC-FR-062-1 to AC-FR-062-3, BR-005)
 * and the ownership contract.
 *
 * Every timestamp is a UTC instant in the past relative to the run's clock, so the suite
 * never races the local day boundary or the future-start rule of PLAN-02.
 */
describe("calendar endpoints", () => {
  let environment: ApiEnvironment;

  beforeAll(async () => {
    environment = await startApiEnvironment();
  }, 240_000);

  afterAll(async () => {
    await database().end();
    await environment?.stop();
  });

  /** UTC at the 9th of 2026-10: a fixed, fully-past month the suite can always read. */
  const target = "2026-10-09";

  /** This suite signs up in UTC, so the profile local date is the UTC date. */
  const now = (): Date => new Date();

  /** `hours` before now on the UTC clock, so a created row is always in the past. */
  const agoIso = (hours: number): string =>
    new Date(now().getTime() - hours * 3_600_000).toISOString();


  /** The current UTC date plus `days`. */
  const dayAfter = (days: number): string => {
    const date = new Date(now());
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

  /** A manual session whose whole range is in the past. */
  async function createSession(
    user: TestUser,
    subjectId: string,
    startedAt: string,
    endedAt: string,
  ): Promise<SessionWire> {
    const response = await call("/api/app/sessions", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { subjectId, startedAt, endedAt },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(sessionSchema, response, "POST session");
  }

  /** PLAN-02 rejects a past start, so entries start tomorrow and are backdated after. */
  async function createPlanEntry(
    user: TestUser,
    subjectId: string,
    startsAt: string,
    durationMin: number,
  ): Promise<PlanEntryWire> {
    const response = await call("/api/app/plan-entries", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { subjectId, startsAt, durationMin },
    });
    return parseBody(planEntryWrittenSchema, response, "POST plan entry");
  }

  /** Moves an entry to a fixed past instant; creation rejects past starts (PLAN-02). */
  async function backdate(entryId: string, startsAt: string): Promise<void> {
    await database().query(
      `UPDATE plan_entries
       SET starts_at = $2::timestamptz, local_date = ($2::timestamptz)::date
       WHERE id = $1`,
      [entryId, startsAt],
    );
  }

  const heatmapOf = async (user: TestUser, requested: string): Promise<CalendarMonthWire> => {
    const response = await call(`/api/app/calendar/heatmap?month=${requested}`, {
      cookie: user.cookie,
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return parseBody(calendarMonthSchema, response, "GET heatmap");
  };

  const dayOf = async (user: TestUser, date: string): Promise<CalendarDayDetailWire> => {
    const response = await call(`/api/app/calendar/days/${date}`, { cookie: user.cookie });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return parseBody(calendarDayDetailSchema, response, "GET day");
  };

  describe("CAL-01 heatmap", () => {
    it("zero-fills the whole month with the four buckets and always-visible minutes (AC-FR-060-1, AC-FR-060-2)", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "Algebra");
      const startedAt = `${target}T10:00:00.000Z`;
      await createSession(user, subject.id, startedAt, `${target}T10:45:00.000Z`);
      await createSession(user, subject.id, "2026-10-11T09:00:00.000Z", "2026-10-11T10:30:00.000Z");
      await createSession(user, subject.id, "2026-10-12T09:00:00.000Z", "2026-10-12T11:30:00.000Z");

      const heatmap = await heatmapOf(user, "2026-10");
      expect(heatmap.month).toBe("2026-10");
      const days = Object.fromEntries(heatmap.days.map((day) => [day.date, day]));
      expect(Object.keys(days).length).toBe(31);

      // The 45-minute session rests on its frozen local day, figure as text next to the
      // bucket; days without activity keep the zero bucket (AC-FR-060-1, AC-FR-060-2).
      expect(days[target]?.minutes).toBe(45);
      expect(days[target]?.bucket).toBe("1_59");
      expect(Object.values(days).every((day) => day.minutes >= 0)).toBe(true);
      expect(new Set(Object.values(days).map((day) => day.bucket))).toEqual(
        new Set(["0", "1_59", "60_119", "120_plus"]),
      );
    });

    it("rejects a missing or malformed month with validation_failed", async () => {
      const user = await signUpUser();
      const missing = await call("/api/app/calendar/heatmap", { cookie: user.cookie });
      expect(missing.status).toBe(400);
      expect(missing.body).toMatchObject({ code: "validation_failed" });

      const malformed = await call("/api/app/calendar/heatmap?month=2026-13", { cookie: user.cookie });
      expect(malformed.status).toBe(400);
      expect(malformed.body).toMatchObject({ code: "validation_failed" });
    });
  });

  describe("CAL-02 day detail", () => {
    it("lists sessions with subject, start, end and minutes, and sums the day total (AC-FR-061-1)", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "Algebra");
      const first = `${target}T10:00:00.000Z`;
      await createSession(user, subject.id, first, `${target}T10:40:00.000Z`);
      await createSession(user, subject.id, `${target}T11:00:00.000Z`, `${target}T11:50:00.000Z`);

      const detail = await dayOf(user, target);
      expect(detail.totalMinutes).toBe(90);
      expect(detail.sessions).toHaveLength(2);
      expect(detail.sessions.map((session) => session.daySeconds)).toEqual([2400, 3000]);
      expect(detail.sessions[0]).toMatchObject({
        subjectName: "Algebra",
        subjectArchived: false,
        dayAllocations: [{ localDate: target, seconds: 2400, isManual: true }],
      });
    });

    it("splits a midnight session into two day allocations, each counting its own day (AC-FR-061-2, AC-E2E-05, EC-009)", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "Physics");
      const before = "2026-10-14";
      const after = "2026-10-15";
      await createSession(user, subject.id, `${before}T23:30:00.000Z`, `${after}T00:30:00.000Z`);

      const first = await dayOf(user, before);
      expect(first.totalMinutes).toBe(30);
      expect(first.sessions).toHaveLength(1);
      expect(first.sessions[0]?.daySeconds).toBe(1800);
      expect(first.sessions[0]?.dayAllocations).toEqual([
        { localDate: before, seconds: 1800, isManual: true },
        { localDate: after, seconds: 1800, isManual: true },
      ]);

      const second = await dayOf(user, after);
      expect(second.totalMinutes).toBe(30);
      expect(second.sessions[0]?.daySeconds).toBe(1800);
    });

    it("labels an archived subject (archived) and hides its plan entries (AC-FR-061-3, FR-062)", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "History");
      await createSession(user, subject.id, `${target}T09:00:00.000Z`, `${target}T09:20:00.000Z`);

      const archived = await call(`/api/app/subjects/${subject.id}/archive`, {
        method: "POST",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
      });
      expect(archived.status, JSON.stringify(archived.body)).toBe(200);

      const detail = await dayOf(user, target);
      expect(detail.sessions[0]).toMatchObject({ subjectName: "History", subjectArchived: true });
      expect(detail.planEntries).toEqual([]);
    });
    it("answers an empty day with 0 minutes and no sessions (AC-FR-061-4)", async () => {
      const user = await signUpUser();
      const detail = await dayOf(user, "2026-10-21");
      expect(detail).toEqual({ date: "2026-10-21", totalMinutes: 0, sessions: [], planEntries: [] });
    });
  });

  describe("CAL-02 plan entries", () => {
    it("lists plan entries with subject and start time; a linked session shows planned and actual (AC-FR-062-1, AC-FR-062-2)", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "Biology");
      const upcoming = await createPlanEntry(user, subject.id, `${dayAfter(1)}T09:00:00.000Z`, 60);
      const done = await createPlanEntry(user, subject.id, `${dayAfter(1)}T14:00:00.000Z`, 60);
      const sessionStart = `${target}T10:00:00.000Z`;
      const session = await createSession(
        user,
        subject.id,
        sessionStart,
        new Date(Date.parse(sessionStart) + 50 * 60_000).toISOString(),
      );

      const link = await call(`/api/app/sessions/${session.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": `"${session.version}"` },
        body: { planEntryId: done.id },
      });
      expect(link.status, JSON.stringify(link.body)).toBe(200);

      await backdate(upcoming.id, `${target}T09:00:00.000Z`);
      await backdate(done.id, `${target}T14:00:00.000Z`);

      const detail = await dayOf(user, target);
      expect(detail.planEntries).toHaveLength(2);
      const byStatus = Object.fromEntries(detail.planEntries.map((entry) => [entry.status, entry]));
      expect(byStatus["upcoming"]).toMatchObject({
        subjectName: "Biology",
        plannedMin: 60,
      });
      expect(byStatus["done"]).toMatchObject({ plannedMin: 60, actualSeconds: 3000 });
      expect(detail.totalMinutes).toBe(50);
    });

    it("shows a stored missed entry with status missed (AC-FR-062-3, BR-005)", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "Chemistry");
      const entry = await createPlanEntry(user, subject.id, `${dayAfter(1)}T09:00:00.000Z`, 45);
      await backdate(entry.id, `${target}T09:00:00.000Z`);

      const missed = await call(`/api/app/plan-entries/${entry.id}/missed`, {
        method: "POST",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
      });
      expect(missed.status, JSON.stringify(missed.body)).toBe(200);

      const detail = await dayOf(user, target);
      expect(detail.planEntries).toHaveLength(1);
      expect(detail.planEntries[0]).toMatchObject({
        subjectName: "Chemistry",
        plannedMin: 45,
        actualSeconds: 0,
        status: "missed",
      });
      expect(detail.totalMinutes).toBe(0);
    });
  });

  describe("ownership", () => {
    it("answers an empty day for another user's sessions, never leaking them", async () => {
      const owner = await signUpUser();
      const viewer = await signUpUser();
      const subject = await createSubject(owner, "Geology");
      const startedAt = agoIso(20);
      await createSession(owner, subject.id, startedAt, agoIso(19.5));

      const response = await call(`/api/app/calendar/days/${target}`, { cookie: viewer.cookie });
      expect(response.status).toBe(200);
      const detail = parseBody(calendarDayDetailSchema, response, "GET foreign day");
      expect(detail).toEqual({ date: target, totalMinutes: 0, sessions: [], planEntries: [] });
    });
  });
});