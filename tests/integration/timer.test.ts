import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { exportContributors, purgeHandlers } from "@/kernel/registries";
import { closeIdleRuns } from "@/modules/timer/public";
import {
  type ApiResponse,
  call,
  database,
  errorEnvelopeSchema,
  parseBody,
  sessionListSchema,
  signUpUser,
  stopTimerResultSchema,
  subjectSchema,
  timerSettingsSchema,
  timerStateResponseSchema,
  timerStateSchema,
  topicSchema,
  type TestUser,
  type TimerWire,
} from "./support/api";
import { startApiEnvironment, type ApiEnvironment } from "./support/environment";

/**
 * MILESTONES M07 acceptance for TIM-01..TIM-08: the single-timer rule and the atomic
 * replace (AC-FR-053, EC-002), pause and resume that keep paused time out of the study
 * time (AC-FR-052), the stop classification of BR-007 and BR-008 (AC-FR-045), recovery and
 * convergence (AC-FR-054, AC-FR-059), the idle auto-close (BR-006, EC-028), settings
 * (FR-057), and the archive guard of EC-007.
 */
describe("timer endpoints", () => {
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

  const newKey = (): string => crypto.randomUUID();

  /** The single-timer rule keys on the run id, so every assertion starts from the state. */
  async function getTimer(user: TestUser) {
    return call("/api/app/timer", { cookie: user.cookie });
  }

  async function stateOf(user: TestUser): Promise<TimerWire | null> {
    const response = await getTimer(user);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return parseBody(timerStateResponseSchema, response, "GET /api/app/timer").timer;
  }

  async function requireState(user: TestUser): Promise<TimerWire> {
    const state = await stateOf(user);
    if (state === null) throw new Error("expected a run");
    return state;
  }

  /** Error envelopes carry `details` only when the refusal explains itself. */
  function detailsOf(error: { details?: unknown }): Record<string, unknown> {
    const details = error.details;
    if (typeof details !== "object" || details === null) {
      throw new Error("expected error details");
    }
    // The envelope schema already proved this is an object; the index type is all a
    // Record needs and each read below is parsed or matched, never trusted.
    return details as Record<string, unknown>;
  }

  async function startRun(
    user: TestUser,
    body: Record<string, unknown>,
    key: string = newKey(),
  ): Promise<{ response: ApiResponse; key: string }> {
    const response = await call("/api/app/timer/start", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": key },
      body,
    });
    return { response, key };
  }

  const action = (path: string, user: TestUser, headers: Record<string, string> = {}) =>
    call(`/api/app/timer/${path}`, { method: "POST", cookie: user.cookie, headers });

  /** A pause or resume needs the run's version, which is the whole of ADR-011 here. */
  const versionHeader = (state: { version: number }): Record<string, string> => ({
    "if-match": `"${state.version}"`,
  });

  async function createSubject(user: TestUser, name: string): Promise<string> {
    const response = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": newKey() },
      body: { name, color: "teal" },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(subjectSchema, response, "POST subject").id;
  }

  async function createTopic(user: TestUser, subjectId: string, name: string): Promise<string> {
    const response = await call(`/api/app/subjects/${subjectId}/topics`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": newKey() },
      body: { name },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(topicSchema, response, "POST topic").id;
  }

  /**
   * The server owns every instant, so a test that needs ten minutes of study asks the
   * database to age the run: the segment start moves back and a Pomodoro's phase clock is
   * put at its end, which is exactly the state a client that stopped polling would leave.
   */
  async function elapse(runId: string, seconds: number): Promise<void> {
    await database().query(
      `UPDATE timer_run_segments
          SET started_at = now() - ($2::double precision * interval '1 second')
        WHERE run_id = $1`,
      [runId, seconds],
    );
    await database().query(
      `UPDATE timer_runs
          SET started_at = now() - ($2::double precision * interval '1 second'),
              last_heartbeat_at = now(),
              phase_ends_at = CASE WHEN mode = 'pomodoro' THEN now() ELSE phase_ends_at END
        WHERE id = $1`,
      [runId, seconds],
    );
  }

  /**
   * A run nobody is watching: the last heartbeat 31 minutes back (past the idle window)
   * and `studySeconds` of focus before it, both computed here so the auto-closed session
   * has an exact duration.
   */
  async function abandon(runId: string, studySeconds: number): Promise<void> {
    const beat = new Date(Date.now() - 31 * 60 * 1000);
    const start = new Date(beat.getTime() - studySeconds * 1000);
    await database().query(
      `UPDATE timer_runs
          SET last_heartbeat_at = $2,
              started_at = $3,
              phase_ends_at = CASE WHEN mode = 'pomodoro' THEN $2 ELSE phase_ends_at END
        WHERE id = $1`,
      [runId, beat, start],
    );
    await database().query("UPDATE timer_run_segments SET started_at = $2 WHERE run_id = $1", [
      runId,
      start,
    ]);
  }

  async function heartbeatAgo(runId: string, seconds: number): Promise<void> {
    await database().query(
      `UPDATE timer_runs
          SET last_heartbeat_at = last_heartbeat_at - ($2::double precision * interval '1 second')
        WHERE id = $1`,
      [runId, seconds],
    );
  }

  async function listSessions(user: TestUser) {
    const response = await call("/api/app/sessions", { cookie: user.cookie });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return parseBody(sessionListSchema, response, "GET /api/app/sessions").data;
  }

  describe("TIM-02 start", () => {
    it("starts a Pomodoro with the settings snapshot and one open focus interval", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const topicId = await createTopic(user, subjectId, "Quadratics");

      const { response, key } = await startRun(user, {
        mode: "pomodoro",
        subjectId,
        topicId,
      });
      expect(response.status, JSON.stringify(response.body)).toBe(201);
      const state = parseBody(timerStateSchema, response, "POST /api/app/timer/start");
      expect(state.state).toBe("running");
      expect(state.mode).toBe("pomodoro");
      expect(state.subjectId).toBe(subjectId);
      expect(state.topicId).toBe(topicId);
      expect(state.phase).toBe("focus");
      expect(Date.parse(state.phaseEndsAt ?? "")).toBeGreaterThan(Date.parse(state.serverTime));
      // The settings are snapshotted on the run (FR-057).
      expect([state.focusMin, state.breakMin, state.longBreakMin]).toEqual([25, 5, 15]);
      expect(state.cyclesBeforeLongBreak).toBe(4);
      expect(state.segments).toEqual({ count: 1, openSegmentStartedAt: expect.any(String), focusSeconds: expect.any(Number) });
      expect(state.version).toBe(1);
      expect(response.headers.get("location")).toBe("/api/app/timer");
      expect(response.headers.get("etag")).toBe(`"${state.id}.1"`);

      // A replay with the same key returns the stored result, not a second run.
      const replay = await startRun(user, { mode: "pomodoro", subjectId, topicId }, key);
      expect(replay.response.status).toBe(201);
      expect(replay.response.headers.get("idempotent-replay")).toBe("true");
      expect(parseBody(timerStateSchema, replay.response, "replay").id).toBe(state.id);
      expect(await stateOf(user)).not.toBeNull();
    });

    it("starts a stopwatch without a phase clock", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Physics");

      const { response } = await startRun(user, { mode: "stopwatch", subjectId });
      expect(response.status, JSON.stringify(response.body)).toBe(201);
      const state = parseBody(timerStateSchema, response, "POST /api/app/timer/start");
      expect(state.phase).toBeNull();
      expect(state.phaseEndsAt).toBeNull();
      expect(state.state).toBe("running");
      expect(state.segments.count).toBe(1);
    });

    it("refuses a second start and names the running one (AC-FR-053-3, EC-002)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const first = await startRun(user, { mode: "pomodoro", subjectId });
      expect(first.response.status).toBe(201);
      const running = parseBody(timerStateSchema, first.response, "POST start");

      const second = await startRun(user, { mode: "stopwatch", subjectId });
      expect(second.response.status).toBe(409);
      const error = errorOf(second.response);
      expect(error.code).toBe("timer_already_running");
      const current = parseBody(
        timerStateSchema,
        { body: detailsOf(error).current, status: 200 },
        "details.current",
      );
      expect(current.id).toBe(running.id);
      expect(current.mode).toBe("pomodoro");
    });

    it("replaces the running one in one transaction, saving its study time (AC-FR-053-2)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Physics");
      const first = await startRun(user, { mode: "stopwatch", subjectId });
      const running = parseBody(timerStateSchema, first.response, "POST start");
      await elapse(running.id, 600);

      const replaced = await startRun(user, { mode: "pomodoro", subjectId, replaceRunning: true });
      expect(replaced.response.status, JSON.stringify(replaced.response.body)).toBe(201);
      const next = parseBody(timerStateSchema, replaced.response, "POST start replace");
      expect(next.id).not.toBe(running.id);
      expect(next.mode).toBe("pomodoro");

      const sessions = await listSessions(user);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.source).toBe("timer");
      expect(sessions[0]?.durationSeconds).toBe(600);
      expect(sessions[0]?.autoClosed).toBe(false);
      // The replacement is not a second live run.
      expect((await stateOf(user))?.id).toBe(next.id);
      expect(await database().query("SELECT id FROM timer_runs WHERE user_id = $1", [user.userId])).toHaveLength(1);
    });

    it("replaces nothing when no run exists (AC-FR-053-2)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Chemistry");
      const { response } = await startRun(user, { mode: "stopwatch", subjectId, replaceRunning: true });
      expect(response.status).toBe(201);
    });

    it("rejects an archived subject, a foreign topic and a foreign plan entry", async () => {
      const user = await signUpUser();
      const other = await signUpUser();
      const archived = await createSubject(user, "Archived");
      const foreign = await createSubject(other, "Someone else's");
      const foreignTopic = await createTopic(other, foreign, "Not mine");

      const subjectVersion = parseBody(
        subjectSchema,
        await call(`/api/app/subjects/${archived}`, { cookie: user.cookie }),
        "GET subject",
      ).version;
      const archiveResponse = await call(`/api/app/subjects/${archived}/archive`, {
        method: "POST",
        cookie: user.cookie,
        headers: { "if-match": `"${subjectVersion}"` },
      });
      expect(archiveResponse.status).toBe(200);

      const onArchived = await startRun(user, { mode: "stopwatch", subjectId: archived });
      expect(errorOf(onArchived.response).code).toBe("subject_archived");

      const withTopic = await startRun(user, {
        mode: "stopwatch",
        subjectId: foreign,
        topicId: foreignTopic,
      });
      expect(withTopic.response.status).toBe(404);
      expect(errorOf(withTopic.response).code).toBe("not_found");

      const own = await createSubject(user, "Mine");
      const mismatched = await startRun(user, {
        mode: "stopwatch",
        subjectId: own,
        topicId: foreignTopic,
      });
      expect(mismatched.response.status).toBe(400);
      const error = errorOf(mismatched.response);
      expect(error.code).toBe("validation_failed");
      expect(detailsOf(error).fields).toContainEqual(
        expect.objectContaining({ path: "topicId", rule: "member_of_subject" }),
      );

      const withPlan = await startRun(user, {
        mode: "stopwatch",
        subjectId: own,
        planEntryId: "01900000-0000-7000-8000-000000000001",
      });
      expect(withPlan.response.status).toBe(404);
    });

    it("requires an Idempotency-Key and a same-origin request", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Biology");
      const noKey = await call("/api/app/timer/start", {
        method: "POST",
        cookie: user.cookie,
        body: { mode: "stopwatch", subjectId },
      });
      expect(noKey.status).toBe(400);
      expect(errorOf(noKey).code).toBe("idempotency_key_required");

      const foreignOrigin = await call("/api/app/timer/start", {
        method: "POST",
        cookie: user.cookie,
        origin: "https://elsewhere.example",
        headers: { "idempotency-key": newKey() },
        body: { mode: "stopwatch", subjectId },
      });
      expect(foreignOrigin.status).toBe(403);
      expect(errorOf(foreignOrigin).code).toBe("csrf_rejected");
      expect(await stateOf(user)).toBeNull();
    });
  });

  describe("TIM-01 read the current timer", () => {
    it("answers null with a fixed tag when nothing runs", async () => {
      const user = await signUpUser();
      const response = await getTimer(user);
      expect(response.status).toBe(200);
      const body = parseBody(timerStateResponseSchema, response, "GET /api/app/timer");
      expect(body.timer).toBeNull();
      expect(Date.parse(body.serverTime)).not.toBeNaN();
      expect(response.headers.get("etag")).toBe('"timer:none"');
      expect(response.headers.get("cache-control")).toBe("private, no-cache");

      const conditional = await call("/api/app/timer", {
        cookie: user.cookie,
        headers: { "if-none-match": '"timer:none"' },
      });
      expect(conditional.status).toBe(304);
      expect(conditional.body).toBeNull();
    });

    it("answers the run with a tag that moves with its version (FR-054, FR-059)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const started = parseBody(timerStateSchema, response, "POST start");

      const read = await getTimer(user);
      expect(read.headers.get("etag")).toBe(`"${started.id}.${started.version}"`);
      const state = parseBody(timerStateResponseSchema, read, "GET /api/app/timer").timer;
      expect(state?.id).toBe(started.id);
      // Elapsed time is server-timestamped (AC-FR-054-4): the summary carries the measured
      // seconds and the response carries the clock the client counts from.
      expect(state?.segments.focusSeconds).toBeGreaterThanOrEqual(0);
      expect(Date.parse(read.headers.get("date") ?? new Date().toISOString())).not.toBeNaN();

      const conditional = await call("/api/app/timer", {
        cookie: user.cookie,
        headers: { "if-none-match": `"${started.id}.${started.version}"` },
      });
      expect(conditional.status).toBe(304);

      const paused = await action("pause", user, versionHeader(started));
      expect(paused.status).toBe(200);
      const after = await getTimer(user);
      expect(after.headers.get("etag")).not.toBe(`"${started.id}.${started.version}"`);
    });

    it("is read only: an idle run reads as absent and is left for the idle job", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "stopwatch", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      await heartbeatAgo(running.id, 31 * 60);

      expect(await stateOf(user)).toBeNull();
      const rows = await database().query<{ id: string }>("SELECT id FROM timer_runs WHERE id = $1", [
        running.id,
      ]);
      expect(rows).toHaveLength(1);
    });
  });
  describe("TIM-03 and TIM-04 pause and resume", () => {
    it("closes the open interval on pause and opens a new one on resume", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");

      const paused = await action("pause", user, versionHeader(running));
      expect(paused.status, JSON.stringify(paused.body)).toBe(200);
      const pausedState = parseBody(timerStateSchema, paused, "POST /pause");
      expect(pausedState.state).toBe("paused");
      expect(pausedState.version).toBe(running.version + 1);
      expect(pausedState.segments.count).toBe(1);
      expect(pausedState.segments.openSegmentStartedAt).toBeNull();

      // A second pause changes nothing: the timer is already reading stopped.
      const again = await action("pause", user, versionHeader(pausedState));
      expect(again.status).toBe(200);
      const stillPaused = parseBody(timerStateSchema, again, "POST /pause again");
      expect(stillPaused.version).toBe(pausedState.version);
      expect(stillPaused.segments).toEqual(pausedState.segments);

      const resumed = await action("resume", user, versionHeader(pausedState));
      expect(resumed.status, JSON.stringify(resumed.body)).toBe(200);
      const resumedState = parseBody(timerStateSchema, resumed, "POST /resume");
      expect(resumedState.state).toBe("running");
      expect(resumedState.segments.count).toBe(2);
      expect(resumedState.segments.openSegmentStartedAt).not.toBeNull();
      expect(resumedState.version).toBe(pausedState.version + 1);

      const noop = await action("resume", user, versionHeader(resumedState));
      expect(noop.status).toBe(200);
      expect(parseBody(timerStateSchema, noop, "POST /resume again").segments.count).toBe(2);
    });

    it("requires the version and rejects a stale one (ADR-011, EC-020)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "stopwatch", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");

      const missing = await action("pause", user);
      expect(missing.status).toBe(400);
      expect(errorOf(missing).code).toBe("version_required");

      const stale = await action("pause", user, { "if-match": `"${running.version + 5}"` });
      expect(stale.status).toBe(409);
      const error = errorOf(stale);
      expect(error.code).toBe("stale_version");
      expect(
        parseBody(timerStateSchema, { body: detailsOf(error).current, status: 200 }, "details.current")
          .version,
      ).toBe(running.version);
    });

    it("keeps paused minutes out of the study time (AC-FR-052-1, BR-012)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "stopwatch", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      await elapse(running.id, 600);

      const paused = await action("pause", user, versionHeader(running));
      const pausedState = parseBody(timerStateSchema, paused, "POST /pause");
      // The measured study time survives the pause, so a reload shows the same value.
      expect(pausedState.segments.focusSeconds).toBeGreaterThanOrEqual(600);
      expect(pausedState.segments.focusSeconds).toBeLessThanOrEqual(602);

      await new Promise((resolve) => setTimeout(resolve, 1200));
      await action("resume", user, versionHeader(pausedState));

      const stopped = await action("stop", user, {
        ...versionHeader({ version: pausedState.version + 1 }),
        "idempotency-key": newKey(),
      });
      expect(stopped.status, JSON.stringify(stopped.body)).toBe(200);
      const result = parseBody(stopTimerResultSchema, stopped, "POST /stop");
      expect(result.outcome).toBe("saved");
      // 600 s of focus, not the 1.2 s the timer spent paused.
      expect(result.session?.durationSeconds).toBeGreaterThanOrEqual(600);
      expect(result.session?.durationSeconds).toBeLessThanOrEqual(603);
    });

    it("shifts the phase clock by the paused wall time, so a break does not expire early (FR-052)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");

      const paused = await action("pause", user, versionHeader(running));
      const pausedState = parseBody(timerStateSchema, paused, "POST /pause");
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const resumed = await action("resume", user, versionHeader(pausedState));
      const resumedState = parseBody(timerStateSchema, resumed, "POST /resume");

      const before = Date.parse(running.phaseEndsAt ?? "");
      const after = Date.parse(resumedState.phaseEndsAt ?? "");
      expect(after - before).toBeGreaterThanOrEqual(1000);
      expect(after - before).toBeLessThan(5000);
    });
  });

  describe("TIM-05 stop", () => {
    it("discards under a minute and writes no session (BR-008, AC-FR-045-2)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      await elapse(running.id, 30);

      const stopped = await action("stop", user, {
        ...versionHeader(running),
        "idempotency-key": newKey(),
      });
      expect(stopped.status).toBe(200);
      const result = parseBody(stopTimerResultSchema, stopped, "POST /stop");
      expect(result.outcome).toBe("discarded");
      expect(result.session).toBeUndefined();
      expect(result.message.length).toBeGreaterThan(0);
      expect(await listSessions(user)).toHaveLength(0);
      expect(await stateOf(user)).toBeNull();
    });

    it("saves a stopwatch from exactly 60 s with no pomodoros (BR-008)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Physics");
      const { response } = await startRun(user, { mode: "stopwatch", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      await elapse(running.id, 60);

      const stopped = await action("stop", user, {
        ...versionHeader(running),
        "idempotency-key": newKey(),
      });
      const result = parseBody(stopTimerResultSchema, stopped, "POST /stop");
      expect(result.outcome).toBe("saved");
      expect(result.session?.source).toBe("timer");
      expect(result.session?.mode).toBe("stopwatch");
      expect(result.session?.durationSeconds).toBe(60);
      expect(result.session?.pomodorosCompleted).toBe(0);
      expect(result.session?.autoClosed).toBe(false);
      expect(result.session?.subjectId).toBe(subjectId);
      // The session lists on SESS-01 at once (FR-038).
      const listed = await listSessions(user);
      expect(listed.map((session) => session.id)).toContain(result.session?.id);
    });

    it("saves a Pomodoro that completed its focus interval and counts it (BR-007)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      await elapse(running.id, 1500);

      const stopped = await action("stop", user, {
        ...versionHeader(running),
        "idempotency-key": newKey(),
      });
      const result = parseBody(stopTimerResultSchema, stopped, "POST /stop");
      expect(result.outcome).toBe("saved");
      expect(result.session?.durationSeconds).toBe(1500);
      expect(result.session?.pomodorosCompleted).toBe(1);
      expect(result.session?.mode).toBe("pomodoro");
    });

    it("saves the time but no pomodoro when the interval never reached five minutes", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      // Two minutes of focus with the phase clock still ahead: no interval has ended and
      // the open one is short of the five minute minimum, so there is time but no Pomodoro.
      await database().query(
        `UPDATE timer_runs SET phase_ends_at = now() + interval '20 minutes' WHERE id = $1`,
        [running.id],
      );
      await database().query(
        `UPDATE timer_run_segments SET started_at = now() - interval '2 minutes' WHERE run_id = $1`,
        [running.id],
      );

      const stopped = await action("stop", user, {
        ...versionHeader(running),
        "idempotency-key": newKey(),
      });
      const result = parseBody(stopTimerResultSchema, stopped, "POST /stop");
      expect(result.outcome).toBe("time_only");
      expect(result.session?.durationSeconds).toBe(120);
      expect(result.session?.pomodorosCompleted).toBe(0);
      expect(result.session?.mode).toBe("pomodoro");
    });

    it("saves a five minute interval that never completed its phase (BR-007)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      await database().query(
        `UPDATE timer_runs SET phase_ends_at = now() + interval '20 minutes' WHERE id = $1`,
        [running.id],
      );
      await database().query(
        `UPDATE timer_run_segments SET started_at = now() - interval '5 minutes' WHERE run_id = $1`,
        [running.id],
      );

      const stopped = await action("stop", user, {
        ...versionHeader(running),
        "idempotency-key": newKey(),
      });
      const result = parseBody(stopTimerResultSchema, stopped, "POST /stop");
      expect(result.outcome).toBe("saved");
      expect(result.session?.durationSeconds).toBe(300);
      // Five minutes of focus counts as a Pomodoro even though the phase never ended.
      expect(result.session?.pomodorosCompleted).toBe(1);
    });

    it("replays one stop for one key and refuses a stop with nothing running (FR-048)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "stopwatch", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      await elapse(running.id, 90);

      const key = newKey();
      const headers = { ...versionHeader(running), "idempotency-key": key };
      const first = await action("stop", user, headers);
      const firstResult = parseBody(stopTimerResultSchema, first, "POST /stop");
      expect(firstResult.outcome).toBe("saved");

      const replay = await action("stop", user, headers);
      expect(replay.status).toBe(200);
      expect(replay.headers.get("idempotent-replay")).toBe("true");
      expect(parseBody(stopTimerResultSchema, replay, "POST /stop replay").session?.id).toBe(
        firstResult.session?.id,
      );
      expect(await listSessions(user)).toHaveLength(1);

      const again = await action("stop", user, {
        ...versionHeader(running),
        "idempotency-key": newKey(),
      });
      expect(again.status).toBe(409);
      expect(errorOf(again).code).toBe("session_already_closed");

      const noKey = await action("stop", user, versionHeader(running));
      expect(noKey.status).toBe(400);
      expect(errorOf(noKey).code).toBe("idempotency_key_required");
    });
  });

  describe("TIM-06 heartbeat", () => {
    it("moves only the heartbeat and needs no version (FR-046)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");

      const beat = await action("heartbeat", user);
      expect(beat.status, JSON.stringify(beat.body)).toBe(200);
      const beatState = parseBody(timerStateSchema, beat, "POST /heartbeat");
      expect(beatState.id).toBe(running.id);
      expect(Date.parse(beatState.lastHeartbeatAt)).toBeGreaterThanOrEqual(
        Date.parse(running.lastHeartbeatAt),
      );
      // The version stays put, so a heartbeat never makes the client's If-Match stale.
      expect(beatState.version).toBe(running.version);
      expect(beatState.phaseEndsAt).toBe(running.phaseEndsAt);

      const empty = await signUpUser();
      const none = await action("heartbeat", empty);
      expect(none.status).toBe(409);
      expect(errorOf(none).code).toBe("session_already_closed");
    });
  });

  describe("BR-006 idle close", () => {
    it("closes an abandoned run at its last heartbeat and saves the time (EC-028)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Physics");
      const { response } = await startRun(user, { mode: "stopwatch", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      await abandon(running.id, 900);

      // Every write verb finalizes it first and then refuses (AC-FR-059-1).
      const paused = await action("pause", user, versionHeader(running));
      expect(paused.status).toBe(409);
      expect(errorOf(paused).code).toBe("session_already_closed");

      const sessions = await listSessions(user);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.autoClosed).toBe(true);
      expect(sessions[0]?.durationSeconds).toBe(900);
      expect(await stateOf(user)).toBeNull();
      expect(
        await database().query("SELECT id FROM timer_runs WHERE id = $1", [running.id]),
      ).toHaveLength(0);
    });

    it("leaves a run to the scheduled job when the client never comes back", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      await abandon(running.id, 1200);

      const closed = await closeIdleRuns(database(), new Date());
      expect(closed.closed).toBeGreaterThanOrEqual(1);
      const sessions = await listSessions(user);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.autoClosed).toBe(true);
      expect(sessions[0]?.durationSeconds).toBe(1200);
      expect(await stateOf(user)).toBeNull();
    });
  });

  describe("TIM-07 and TIM-08 settings", () => {
    it("answers the defaults at version 0 without creating a row (FR-057)", async () => {
      const user = await signUpUser();
      const response = await call("/api/app/timer/settings", { cookie: user.cookie });
      expect(response.status).toBe(200);
      const settings = parseBody(timerSettingsSchema, response, "GET /api/app/timer/settings");
      expect(settings).toEqual({
        focusMin: 25,
        breakMin: 5,
        longBreakMin: 15,
        cyclesBeforeLongBreak: 4,
        audioLoop: "none",
        audioVolume: 50,
        version: 0,
        updatedAt: null,
      });
      expect(response.headers.get("etag")).toBe('"0"');
      expect(
        await database().query("SELECT user_id FROM timer_settings WHERE user_id = $1", [user.userId]),
      ).toHaveLength(0);
    });

    it("creates the row on the first patch, with or without If-Match", async () => {
      const user = await signUpUser();
      const created = await call("/api/app/timer/settings", {
        method: "PATCH",
        cookie: user.cookie,
        body: { focusMin: 50, breakMin: 10 },
      });
      expect(created.status, JSON.stringify(created.body)).toBe(200);
      const settings = parseBody(timerSettingsSchema, created, "PATCH /api/app/timer/settings");
      expect(settings).toMatchObject({ focusMin: 50, breakMin: 10, longBreakMin: 15, version: 1 });
      expect(settings.updatedAt).not.toBeNull();
      expect(created.headers.get("etag")).toBe('"1"');

      const stale = await call("/api/app/timer/settings", {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": `"${settings.version + 3}"` },
        body: { focusMin: 30 },
      });
      expect(stale.status).toBe(409);
      const error = errorOf(stale);
      expect(error.code).toBe("stale_version");
      expect(detailsOf(error).current).toMatchObject({ focusMin: 50, version: 1 });

      const missing = await call("/api/app/timer/settings", {
        method: "PATCH",
        cookie: user.cookie,
        body: { focusMin: 30 },
      });
      expect(missing.status).toBe(400);
      expect(errorOf(missing).code).toBe("version_required");

      const empty = await call("/api/app/timer/settings", {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": `"${settings.version}"` },
        body: {},
      });
      expect(empty.status).toBe(400);
      expect(errorOf(empty).code).toBe("validation_failed");
    });

    it("enforces the documented ranges (FR-057)", async () => {
      const user = await signUpUser();
      const patch = (body: Record<string, unknown>) =>
        call("/api/app/timer/settings", { method: "PATCH", cookie: user.cookie, body });

      for (const body of [
        { focusMin: 0 },
        { focusMin: 121 },
        { breakMin: 0 },
        { breakMin: 61 },
        { longBreakMin: 0 },
        { longBreakMin: 61 },
        { cyclesBeforeLongBreak: 1 },
        { cyclesBeforeLongBreak: 9 },
        { audioVolume: -1 },
        { audioVolume: 101 },
        { audioLoop: "thunder" },
      ]) {
        const response = await patch(body);
        expect(response.status, JSON.stringify(body)).toBe(400);
        expect(errorOf(response).code).toBe("validation_failed");
      }

      // The extremes at once, then a second patch that has to carry the current version.
      const wide = await patch({
        focusMin: 120,
        breakMin: 60,
        longBreakMin: 60,
        cyclesBeforeLongBreak: 8,
      });
      expect(wide.status, JSON.stringify(wide.body)).toBe(200);
      const narrow = await call("/api/app/timer/settings", {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
        body: { focusMin: 1, breakMin: 1, longBreakMin: 1, cyclesBeforeLongBreak: 2, audioVolume: 0, audioLoop: "white_noise" },
      });
      expect(narrow.status, JSON.stringify(narrow.body)).toBe(200);
      expect(parseBody(timerSettingsSchema, narrow, "PATCH settings")).toMatchObject({
        focusMin: 1,
        breakMin: 1,
        longBreakMin: 1,
        cyclesBeforeLongBreak: 2,
        audioVolume: 0,
        audioLoop: "white_noise",
        version: 2,
      });
    });

    it("leaves a running timer on its snapshot (FR-057)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");

      const patched = await call("/api/app/timer/settings", {
        method: "PATCH",
        cookie: user.cookie,
        body: { focusMin: 50, cyclesBeforeLongBreak: 6 },
      });
      expect(patched.status).toBe(200);

      const state = await requireState(user);
      expect(state.focusMin).toBe(25);
      expect(state.cyclesBeforeLongBreak).toBe(4);
      expect(state.phaseEndsAt).toBe(running.phaseEndsAt);
    });
  });

  describe("ownership and wiring", () => {
    it("gives every caller their own timer and no sight of another's", async () => {
      const owner = await signUpUser();
      const other = await signUpUser();
      const subjectId = await createSubject(owner, "Algebra");
      const { response } = await startRun(owner, { mode: "stopwatch", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");

      expect(await stateOf(other)).toBeNull();
      const stolen = await action("pause", other, versionHeader(running));
      expect(stolen.status).toBe(409);
      expect(errorOf(stolen).code).toBe("session_already_closed");

      const settings = await call("/api/app/timer/settings", { cookie: other.cookie });
      expect(parseBody(timerSettingsSchema, settings, "settings").version).toBe(0);

      // The owner's run is untouched by any of it.
      const state = await requireState(owner);
      expect(state.id).toBe(running.id);
      expect(state.state).toBe("running");
    });

    it("blocks archiving the subject of a running timer (EC-007, FR-053)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const subjectVersion = parseBody(
        subjectSchema,
        await call(`/api/app/subjects/${subjectId}`, { cookie: user.cookie }),
        "GET subject",
      ).version;
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");

      const blocked = await call(`/api/app/subjects/${subjectId}/archive`, {
        method: "POST",
        cookie: user.cookie,
        headers: { "if-match": `"${subjectVersion}"` },
      });
      expect(blocked.status).toBe(409);
      const error = errorOf(blocked);
      expect(error.code).toBe("subject_has_running_session");
      expect(detailsOf(error).timerRunId).toBe(running.id);
    });

    it("purges and exports the timer's rows under its own key (SESS-04, SESS-05)", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const { response } = await startRun(user, { mode: "pomodoro", subjectId });
      const running = parseBody(timerStateSchema, response, "POST start");
      await call("/api/app/timer/settings", {
        method: "PATCH",
        cookie: user.cookie,
        body: { focusMin: 30 },
      });

      const exported = exportContributors.entries().find(([key]) => key === "timer")?.[1];
      const section = await exported?.(user.userId);
      expect(section?.section).toBe("timer");
      expect(JSON.stringify(section?.rows)).toContain(running.id);

      const purge = purgeHandlers.entries().find(([key]) => key === "timer")?.[1];
      expect(await purge?.(user.userId)).toBe(1);
      expect(
        await database().query("SELECT id FROM timer_runs WHERE user_id = $1", [user.userId]),
      ).toHaveLength(0);
      expect(
        await database().query("SELECT user_id FROM timer_settings WHERE user_id = $1", [user.userId]),
      ).toHaveLength(0);
    });
  });
});
