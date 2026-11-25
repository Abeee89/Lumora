import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { exportContributors, purgeHandlers } from "@/kernel/registries";
import {
  goalEventSubscribers,
  getGoalProgress,
  seedDailyGoal,
  setDailyGoal,
  type GoalMetEvent,
} from "@/modules/goals/public";
import * as timer from "@/modules/timer/public";
import {
  call,
  dailyGoalSchema,
  database,
  errorEnvelopeSchema,
  goalProgressSchema,
  goalSetSchema,
  parseBody,
  sessionListSchema,
  signUpUser,
  subjectGoalSchema,
  subjectSchema,
  type GoalProgressWire,
  type GoalSetWire,
  type SubjectWire,
  type TestUser,
} from "./support/api";
import { startApiEnvironment, type ApiEnvironment } from "./support/environment";
import { expectHiddenFromOtherUser } from "./support/ownership";

/**
 * MILESTONES M08 acceptance for GOAL-01..GOAL-05: the 120-minute row AUTH-01 creates
 * (AC-FR-070-1), the dated target that only moves from today forward (FR-074, AC-FR-074-3),
 * the range refusal (EC-023), subject targets with the archived suspension (AC-FR-071-4),
 * progress over frozen local dates including a running run (AC-E2E-06, AC-FR-072-2), the
 * once-per-day GoalMet publication (APPLICATION-FLOWS section 7) and the ownership contract.
 */
describe("goal endpoints", () => {
  let environment: ApiEnvironment;
  const events: GoalMetEvent[] = [];

  beforeAll(async () => {
    environment = await startApiEnvironment();
    goalEventSubscribers.register("integration-test-goals", async (event) => {
      events.push(event);
    });
  }, 240_000);

  afterAll(async () => {
    await database().end();
    await environment?.stop();
  });

  const errorOf = (response: { body: unknown; status: number }) =>
    parseBody(errorEnvelopeSchema, response, "error");

  /** Every user in this suite signs up in UTC, so the profile local date is the UTC date. */
  const today = (): string => new Date().toISOString().slice(0, 10);

  const dayAt = (offset: number): string => {
    const date = new Date(`${today()}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
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

  /** A manual session inside the past, so the suite never races the local day boundary. */
  async function createSession(
    user: TestUser,
    subjectId: string,
    day: string,
    fromHour: string,
    toHour: string,
  ): Promise<void> {
    const response = await call("/api/app/sessions", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: {
        subjectId,
        startedAt: `${day}T${fromHour}:00.000Z`,
        endedAt: `${day}T${toHour}:00.000Z`,
      },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
  }

  const goalSetOf = async (user: TestUser): Promise<GoalSetWire> => {
    const response = await call("/api/app/goals", { cookie: user.cookie });
    expect(response.status).toBe(200);
    return parseBody(goalSetSchema, response, "GET /api/app/goals");
  };

  const progressOf = async (user: TestUser, date?: string): Promise<GoalProgressWire> => {
    const query = date === undefined ? "" : `?date=${date}`;
    const response = await call(`/api/app/goals/progress${query}`, { cookie: user.cookie });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return parseBody(goalProgressSchema, response, "GET /api/app/goals/progress");
  };

  const putDaily = (user: TestUser, targetMinutes: unknown) =>
    call("/api/app/goals/daily", { method: "PUT", cookie: user.cookie, body: { targetMinutes } });

  const putSubject = (user: TestUser, subjectId: string, targetMinutes: unknown) =>
    call(`/api/app/goals/subjects/${subjectId}`, {
      method: "PUT",
      cookie: user.cookie,
      body: { targetMinutes },
    });

  const removeSubject = (user: TestUser, subjectId: string) =>
    call(`/api/app/goals/subjects/${subjectId}`, { method: "DELETE", cookie: user.cookie });

  /** A target as it was in force on a past day: the suite cannot write history over HTTP. */
  async function seedHistory(user: TestUser, date: string, targetMinutes: number): Promise<void> {
    await database().query(
      `INSERT INTO daily_goal_history (user_id, effective_from, target_minutes)
       VALUES ($1, $2, $3)`,
      [user.userId, date, targetMinutes],
    );
  }

  describe("AUTH-01 starting goal and GOAL-01", () => {
    it("seeds 120 minutes on the registration local date and answers it", async () => {
      const user = await signUpUser({ timezone: "America/New_York" });
      const registeredOn = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
      }).format(new Date());

      const set = await goalSetOf(user);
      expect(set).toEqual({ daily: { targetMinutes: 120, effectiveFrom: registeredOn }, subjects: [] });

      const rows = await database().query<{ target_minutes: number; effective_from: string }>(
        "SELECT target_minutes, effective_from::text FROM daily_goal_history WHERE user_id = $1",
        [user.userId],
      );
      expect(rows).toEqual([{ target_minutes: 120, effective_from: registeredOn }]);
    });

    it("never resets a target when the seeding runs again", async () => {
      const user = await signUpUser();
      const saved = await putDaily(user, 90);
      expect(saved.status, JSON.stringify(saved.body)).toBe(200);

      // The Google callback seeds through the same function on every account it creates;
      // a second call for an account that has history must leave it alone.
      await seedDailyGoal(database(), {
        userId: user.userId,
        timezone: "UTC",
        now: new Date(),
      });

      const set = await goalSetOf(user);
      expect(set.daily.targetMinutes).toBe(90);
      const count = await database().one<{ count: string }>(
        "SELECT count(*)::text FROM daily_goal_history WHERE user_id = $1",
        [user.userId],
      );
      expect(count?.count).toBe("1");
    });
  });

  describe("GOAL-02 daily target", () => {
    it("applies from today forward and upserts the same day", async () => {
      const user = await signUpUser();
      const subjectId = (await createSubject(user, "Algebra")).id;
      await seedHistory(user, dayAt(-2), 30);
      await createSession(user, subjectId, dayAt(-1), "10:00", "10:40");

      // A past day keeps the target in force on it (AC-FR-074-3).
      const past = await progressOf(user, dayAt(-1));
      expect(past).toMatchObject({ date: dayAt(-1), minutes: 40, targetMinutes: 30, goalMet: true });
      expect(past.percent).toBe(133);

      const response = await putDaily(user, 90);
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      const written = parseBody(dailyGoalSchema, response, "PUT /api/app/goals/daily");
      expect(written).toEqual({ targetMinutes: 90, effectiveFrom: today() });

      // Today reads the new target; the past days do not move.
      expect((await goalSetOf(user)).daily).toEqual({ targetMinutes: 90, effectiveFrom: today() });
      expect((await progressOf(user, dayAt(-1))).targetMinutes).toBe(30);
      expect((await progressOf(user, today())).targetMinutes).toBe(90);

      // A second change on the same day rewrites that day's row without touching the past.
      const again = await putDaily(user, 45);
      expect(again.status).toBe(200);
      expect(
        parseBody(dailyGoalSchema, again, "PUT /api/app/goals/daily"),
      ).toEqual({ targetMinutes: 45, effectiveFrom: today() });
      const rows = await database().query<{ effective_from: string; target_minutes: number }>(
        "SELECT effective_from::text, target_minutes FROM daily_goal_history WHERE user_id = $1 ORDER BY effective_from",
        [user.userId],
      );
      expect(rows).toEqual([
        { effective_from: dayAt(-2), target_minutes: 30 },
        { effective_from: today(), target_minutes: 45 },
      ]);
    });

    it("refuses a value outside 5..1440 and a non-numeric target", async () => {
      const user = await signUpUser();
      for (const value of [4, 1441, 0, -5, 1.5]) {
        const response = await putDaily(user, value);
        expect(response.status, `${value} must be refused`).toBe(400);
        expect(errorOf(response)).toMatchObject({
          code: "goal_out_of_range",
          details: { min: 5, max: 1440 },
        });
      }
      expect((await goalSetOf(user)).daily.targetMinutes).toBe(120);

      const notANumber = await putDaily(user, "90");
      expect(notANumber.status).toBe(400);
      expect(errorOf(notANumber).code).toBe("validation_failed");

      const missing = await call("/api/app/goals/daily", {
        method: "PUT",
        cookie: user.cookie,
        body: {},
      });
      expect(missing.status).toBe(400);
      expect(errorOf(missing).code).toBe("validation_failed");
    });

    it("rejects a write from another origin", async () => {
      const user = await signUpUser();
      const response = await call("/api/app/goals/daily", {
        method: "PUT",
        cookie: user.cookie,
        origin: "https://elsewhere.example",
        body: { targetMinutes: 60 },
      });
      expect(response.status).toBe(403);
      expect(errorOf(response).code).toBe("csrf_rejected");
      expect((await goalSetOf(user)).daily.targetMinutes).toBe(120);
    });
  });

  describe("GOAL-03, GOAL-04 subject targets", () => {
    it("sets, lists and removes one target per subject", async () => {
      const user = await signUpUser();
      const algebra = await createSubject(user, "Algebra");
      const physics = await createSubject(user, "Physics");

      const response = await putSubject(user, algebra.id, 60);
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      expect(parseBody(subjectGoalSchema, response, "PUT subject goal")).toEqual({
        subjectId: algebra.id,
        targetMinutes: 60,
        subjectArchived: false,
      });

      const set = await goalSetOf(user);
      expect(set.subjects).toEqual([
        { subjectId: algebra.id, targetMinutes: 60, subjectArchived: false },
      ]);

      const progress = await progressOf(user);
      expect(progress.subjects).toEqual([
        { subjectId: algebra.id, minutes: 0, targetMinutes: 60, percent: 0, goalMet: false },
      ]);

      // A subject target above the overall goal is allowed and leaves the overall goal alone.
      expect((await putSubject(user, physics.id, 300)).status).toBe(200);
      expect((await goalSetOf(user)).daily.targetMinutes).toBe(120);

      const removed = await removeSubject(user, algebra.id);
      expect(removed.status).toBe(204);
      expect((await goalSetOf(user)).subjects.map((goal) => goal.subjectId)).toEqual([physics.id]);

      // GOAL-04 is idempotent.
      expect((await removeSubject(user, algebra.id)).status).toBe(204);
    });

    it("refuses an archived subject's target and suspends the one it kept", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "Algebra");
      expect((await putSubject(user, subject.id, 60)).status).toBe(200);

      const archived = await call(`/api/app/subjects/${subject.id}/archive`, {
        method: "POST",
        cookie: user.cookie,
        headers: { "if-match": `"${subject.version}"` },
      });
      expect(archived.status).toBe(200);

      const refused = await putSubject(user, subject.id, 90);
      expect(refused.status).toBe(409);
      expect(errorOf(refused).code).toBe("subject_archived");

      // GOAL-01 still lists the goal, marked suspended; GOAL-05 omits it (AC-FR-071-4).
      expect((await goalSetOf(user)).subjects).toEqual([
        { subjectId: subject.id, targetMinutes: 60, subjectArchived: true },
      ]);
      expect((await progressOf(user)).subjects).toEqual([]);

      // Removing it is allowed while archived.
      expect((await removeSubject(user, subject.id)).status).toBe(204);
      expect((await goalSetOf(user)).subjects).toEqual([]);
    });

    it("refuses values outside the range and hides another user's subject", async () => {
      const owner = await signUpUser();
      const other = await signUpUser();
      const subject = await createSubject(owner, "Algebra");

      const tooSmall = await putSubject(owner, subject.id, 4);
      expect(tooSmall.status).toBe(400);
      expect(errorOf(tooSmall).code).toBe("goal_out_of_range");

      const tooBig = await putSubject(owner, subject.id, 1441);
      expect(tooBig.status).toBe(400);
      expect(errorOf(tooBig).code).toBe("goal_out_of_range");

      await expectHiddenFromOtherUser(other, {
        label: "PUT another user's subject goal",
        method: "PUT",
        path: `/api/app/goals/subjects/${subject.id}`,
        body: { targetMinutes: 60 },
      });
      await expectHiddenFromOtherUser(other, {
        label: "DELETE another user's subject goal",
        method: "DELETE",
        path: `/api/app/goals/subjects/${subject.id}`,
      });
      await expectHiddenFromOtherUser(other, {
        label: "PUT a malformed subject id",
        method: "PUT",
        path: "/api/app/goals/subjects/not-a-uuid",
        body: { targetMinutes: 60 },
      });
    });
  });

  describe("GOAL-05 progress", () => {
    it("splits a midnight-crossing session into the two frozen local days", async () => {
      const user = await signUpUser();
      const subjectId = (await createSubject(user, "Algebra")).id;
      const response = await call("/api/app/sessions", {
        method: "POST",
        cookie: user.cookie,
        headers: { "idempotency-key": crypto.randomUUID() },
        body: {
          subjectId,
          startedAt: `${dayAt(-2)}T23:50:00.000Z`,
          endedAt: `${dayAt(-1)}T00:10:00.000Z`,
        },
      });
      expect(response.status, JSON.stringify(response.body)).toBe(201);

      const first = await progressOf(user, dayAt(-2));
      expect(first).toMatchObject({ date: dayAt(-2), minutes: 10, targetMinutes: 120 });
      expect(first.percent).toBe(8);
      const second = await progressOf(user, dayAt(-1));
      expect(second).toMatchObject({ date: dayAt(-1), minutes: 10, targetMinutes: 120 });
    });

    it("counts a running stopwatch run and stops counting it once it is closed", async () => {
      const user = await signUpUser();
      const subjectId = (await createSubject(user, "Algebra")).id;
      const context = { timezone: "UTC", rolloverHour: 0 };
      // A deterministic clock: the run starts just after the local midnight and is read
      // ten minutes later, so both instants are on the same local day by construction.
      const start = new Date(`${today()}T00:00:05.000Z`);
      const read = new Date(start.getTime() + 10 * 60_000);

      const started = await timer.startTimer(
        database(),
        user.userId,
        { mode: "stopwatch", subjectId },
        { now: start, ...context },
      );
      expect(started.state).toBe("running");

      const running = await getGoalProgress(database(), user.userId, today(), {
        now: read,
        ...context,
      });
      expect(running).toMatchObject({ minutes: 10, targetMinutes: 120, goalMet: false });

      // Once the run is stopped its focus is a session, so it is counted exactly once.
      const stopped = await timer.stopTimer(
        database(),
        user.userId,
        started.version,
        { now: read, ...context },
        null,
      );
      expect(stopped.outcome).toBe("saved");
      expect((await progressOf(user)).minutes).toBe(10);
    });

    it("keeps the frozen dates when the profile zone changes", async () => {
      const user = await signUpUser();
      const subjectId = (await createSubject(user, "Algebra")).id;
      await createSession(user, subjectId, dayAt(-1), "10:00", "10:40");
      expect((await progressOf(user, dayAt(-1))).minutes).toBe(40);

      const moved = await call("/api/app/profile", {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": `"${user.version}"` },
        body: { timezone: "Pacific/Kiritimati" },
      });
      expect(moved.status, JSON.stringify(moved.body)).toBe(200);

      // BR-014: the allocation kept the date it was recorded under.
      expect((await progressOf(user, dayAt(-1))).minutes).toBe(40);

      const localToday = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Pacific/Kiritimati",
      }).format(new Date());
      const todayInZone = await progressOf(user);
      expect(todayInZone.date).toBe(localToday);
      expect(todayInZone.minutes).toBe(0);
    });

    it("refuses a malformed date", async () => {
      const user = await signUpUser();
      for (const date of ["2026-13-01", "yesterday", "2026-11-25T00:00:00Z"]) {
        const response = await call(`/api/app/goals/progress?date=${encodeURIComponent(date)}`, {
          cookie: user.cookie,
        });
        expect(response.status, `${date} must be refused`).toBe(400);
        expect(errorOf(response).code).toBe("validation_failed");
      }
    });
  });

  describe("GoalMet (APPLICATION-FLOWS section 7)", () => {
    it("publishes once for the write that crosses the target, and never on a delete", async () => {
      const user = await signUpUser();
      const subjectId = (await createSubject(user, "Algebra")).id;
      const day = dayAt(-1);
      await seedHistory(user, day, 30);
      events.length = 0;

      await createSession(user, subjectId, day, "11:00", "11:20");
      expect(events).toHaveLength(0);

      await createSession(user, subjectId, day, "12:00", "12:10");
      expect(events).toEqual([
        {
          type: "GoalMet",
          userId: user.userId,
          localDate: day,
          minutes: 30,
          targetMinutes: 30,
          occurredAt: expect.any(String),
        },
      ]);

      // A later write on a met day repeats nothing (FR-073, APPLICATION-FLOWS section 7).
      await createSession(user, subjectId, day, "13:00", "13:10");
      expect(events).toHaveLength(1);

      const sessions = await call("/api/app/sessions?limit=25", { cookie: user.cookie });
      expect(sessions.status).toBe(200);

      // AC-FR-073-4: deleting time cannot publish a goal-met transition, and the day is
      // simply reported as not met again.
      const { data } = parseBody(sessionListSchema, sessions, "GET sessions");
      const first = data[0];
      expect(first).toBeDefined();
      const removed = await call(`/api/app/sessions/${first?.id}`, {
        method: "DELETE",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
      });
      expect(removed.status).toBe(204);
      expect(events).toHaveLength(1);
    });

    it("publishes when a lowered target makes today met at once", async () => {
      const user = await signUpUser();
      const subjectId = (await createSubject(user, "Algebra")).id;
      const context = { timezone: "UTC", rolloverHour: 0 };
      const start = new Date(`${today()}T00:00:05.000Z`);
      const now = new Date(start.getTime() + 6 * 60_000);

      const started = await timer.startTimer(
        database(),
        user.userId,
        { mode: "stopwatch", subjectId },
        { now: start, ...context },
      );
      expect(started.state).toBe("running");

      events.length = 0;
      const written = await setDailyGoal(database(), user.userId, 5, { now, ...context });
      expect(written).toEqual({ targetMinutes: 5, effectiveFrom: today() });
      expect(events).toEqual([
        {
          type: "GoalMet",
          userId: user.userId,
          localDate: today(),
          minutes: 6,
          targetMinutes: 5,
          occurredAt: now.toISOString(),
        },
      ]);
    });
  });

  describe("purge and export", () => {
    it("purges both tables and exports them by kind", async () => {
      const user = await signUpUser();
      const subject = await createSubject(user, "Algebra");
      expect((await putSubject(user, subject.id, 60)).status).toBe(200);

      const contributor = exportContributors.entries().find(([key]) => key === "goals")?.[1];
      expect(contributor).toBeDefined();
      const section = (await contributor?.(user.userId)) as {
        section: string;
        rows: Record<string, unknown>[];
      };
      expect(section.section).toBe("goals");
      expect(section.rows).toHaveLength(2);
      expect(section.rows).toEqual([
        expect.objectContaining({ kind: "daily", target_minutes: 120 }),
        expect.objectContaining({ kind: "subject", subject_id: subject.id, target_minutes: 60 }),
      ]);

      const handler = purgeHandlers.entries().find(([key]) => key === "goals")?.[1];
      expect(handler).toBeDefined();
      expect(await handler?.(user.userId)).toBe(2);

      const remaining = await database().query<{ daily: string; goals: string }>(
        `SELECT (SELECT count(*)::text FROM daily_goal_history WHERE user_id = $1) AS daily,
                (SELECT count(*)::text FROM subject_goals WHERE user_id = $1) AS goals`,
        [user.userId],
      );
      expect(remaining).toEqual([{ daily: "0", goals: "0" }]);

      // An account without history reads the configured default, unseeded (OD-M46).
      const set = await goalSetOf(user);
      expect(set.daily).toEqual({ targetMinutes: 120, effectiveFrom: today() });
      expect(set.subjects).toEqual([]);
    });
  });
});