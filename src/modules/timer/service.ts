/**
 * Timer (FR-050..FR-059): a thin, server-authoritative state machine over a single run per
 * user (BR-011). The client sends commands, never durations or timestamps (BR-012, EC-010);
 * every instant this module stores is the server's, and the client's arithmetic is only a
 * display of `phaseEndsAt` minus `serverTime`.
 *
 * Study time is the sum of the run's focus segments (BR-012, NFR-090): a pause closes the
 * open segment, a resume opens a new one, and a Pomodoro break is not a segment at all, so
 * break and paused time can never reach the total (BR-009). A stop classifies that total
 * per BR-007 and BR-008 and hands the session to Study sessions (FR-040, FR-048).
 *
 * `TimerState` and `TimerSettings` are the wire shapes of API-SCHEMAS section 10.
 */
import { config } from "../../kernel/config";
import { uuidv7 } from "../../kernel/crypto";
import type { Database, Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import { archiveGuards } from "../../kernel/registries";
import { localDateOf } from "../../kernel/time";
import * as sessions from "../sessions/public";
import * as subjects from "../subjects/public";
import * as topics from "../topics/public";

export type TimerMode = "stopwatch" | "pomodoro";
export type TimerRunState = "running" | "paused";
export type TimerPhase = "focus" | "break" | "long_break";
export type AudioLoop = "none" | "rain" | "white_noise" | "cafe";
export type StopOutcome = "saved" | "time_only" | "discarded";

export interface TimerSegmentsSummary {
  count: number;
  openSegmentStartedAt: string | null;
  /**
   * Measured study time (BR-012): the whole seconds of focus behind `count`, with the open
   * segment counted up to `serverTime`. FR-021 and AC-FR-052-2 must show an elapsed value
   * that the documented `count`/`openSegmentStartedAt` pair cannot express for a paused run.
   */
  focusSeconds: number;
}

/** API-SCHEMAS section 10 `TimerState`. */
export interface TimerState {
  id: string;
  state: TimerRunState;
  mode: TimerMode;
  subjectId: string;
  topicId: string | null;
  planEntryId: string | null;
  phase: TimerPhase | null;
  phaseEndsAt: string | null;
  cycleIndex: number;
  pomodorosCompleted: number;
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number;
  startedAt: string;
  segments: TimerSegmentsSummary;
  lastHeartbeatAt: string;
  serverTime: string;
  version: number;
}

export interface TimerSettings {
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number;
  audioLoop: AudioLoop;
  audioVolume: number;
  version: number;
  updatedAt: string | null;
}

export interface StartTimerInput {
  mode: TimerMode;
  subjectId: string;
  topicId?: string | null | undefined;
  planEntryId?: string | null | undefined;
  replaceRunning?: boolean | undefined;
}

export interface UpdateTimerSettingsInput {
  focusMin?: number | undefined;
  breakMin?: number | undefined;
  longBreakMin?: number | undefined;
  cyclesBeforeLongBreak?: number | undefined;
  audioLoop?: AudioLoop | undefined;
  audioVolume?: number | undefined;
}

export interface StopTimerResult {
  outcome: StopOutcome;
  session?: sessions.StudySession | undefined;
  message: string;
}

/** What the module needs about the caller's clock and zone, frozen on the run (R5). */
export interface TimerContext {
  now: Date;
  timezone: string;
  rolloverHour: number;
}

interface RunRow {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  plan_entry_id: string | null;
  mode: TimerMode;
  state: TimerRunState;
  phase: TimerPhase | null;
  phase_ends_at: Date | null;
  cycle_index: number;
  pomodoros_completed: number;
  focus_min: number;
  break_min: number;
  long_break_min: number;
  cycles_before_long_break: number;
  started_at: Date;
  timezone: string;
  local_date: string;
  day_rollover_hour: number;
  last_heartbeat_at: Date;
  version: number;
  created_at: Date;
  updated_at: Date;
}

interface SegmentRow {
  seq: number;
  started_at: Date;
  ended_at: Date | null;
}

interface SettingsRow {
  user_id: string;
  focus_min: number;
  break_min: number;
  long_break_min: number;
  cycles_before_long_break: number;
  audio_loop: AudioLoop;
  audio_volume: number;
  version: number;
  created_at: Date;
  updated_at: Date;
}

const SELECT_RUN = `
  SELECT id, user_id, subject_id, topic_id, plan_entry_id, mode, state, phase, phase_ends_at,
         cycle_index, pomodoros_completed, focus_min, break_min, long_break_min,
         cycles_before_long_break, started_at, timezone, local_date::text, day_rollover_hour,
         last_heartbeat_at, version, created_at, updated_at
  FROM timer_runs`;

const SELECT_SETTINGS = `
  SELECT user_id, focus_min, break_min, long_break_min, cycles_before_long_break, audio_loop,
         audio_volume, version, created_at, updated_at
  FROM timer_settings`;

function fieldsError(path: string, rule: string, extra: Record<string, unknown> = {}): AppError {
  return new AppError("validation_failed", { details: { fields: [{ path, rule, ...extra }] } });
}

/** A duplicate key: for `timer_runs` the only unique key is the one live run per user. */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "23505";
}

/** BR-009 defaults, from configuration (NFR-062); a user row overrides them field by field. */
export function defaultSettings(): TimerSettings {
  return {
    focusMin: config.timer.focusMinutes,
    breakMin: config.timer.breakMinutes,
    longBreakMin: config.timer.longBreakMinutes,
    cyclesBeforeLongBreak: config.timer.cyclesBeforeLongBreak,
    audioLoop: "none",
    audioVolume: 50,
    version: 0,
    updatedAt: null,
  };
}

/** BR-006: a run whose last heartbeat is older than the idle window is over. */
export function idleDeadline(lastHeartbeatAt: Date): Date {
  return new Date(lastHeartbeatAt.getTime() + config.timer.idleCloseMinutes * 60_000);
}

export function isIdle(run: { last_heartbeat_at: Date }, now: Date): boolean {
  return idleDeadline(run.last_heartbeat_at) < now;
}

/** The length of one phase, in seconds (BR-009, snapshotted on the run). */
export function phaseSeconds(
  settings: { focusMin: number; breakMin: number; longBreakMin: number },
  phase: TimerPhase,
): number {
  if (phase === "focus") return settings.focusMin * 60;
  if (phase === "break") return settings.breakMin * 60;
  return settings.longBreakMin * 60;
}

export interface PhaseSnapshot {
  phase: TimerPhase;
  phaseEndsAt: Date;
  cycleIndex: number;
  pomodorosCompleted: number;
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number;
}

export interface PhaseAdvance {
  phase: TimerPhase;
  phaseEndsAt: Date;
  cycleIndex: number;
  pomodorosCompleted: number;
  /** Focus intervals that ran to their end during the catch-up, oldest first. */
  closedFocus: sessions.Interval[];
  /** The focus interval open at the limit instant, or `null` while a break runs. */
  openFocusStartedAt: Date | null;
}

/**
 * FR-050, BR-009: walk the Pomodoro clock forward to `now`. The server owns the phases, so
 * a client that stopped polling (a background tab, a closed laptop) still yields the right
 * completed pomodoros and focus intervals when it returns. `cap` bounds the walk at the
 * idle deadline, where BR-006 takes over.
 */
export function advancePhases(
  snapshot: PhaseSnapshot,
  options: { openFocusStartedAt: Date | null; now: Date; cap: Date },
): PhaseAdvance {
  const limit = options.now < options.cap ? options.now : options.cap;
  let phase = snapshot.phase;
  let phaseEndsAt = snapshot.phaseEndsAt;
  let cycleIndex = snapshot.cycleIndex;
  let pomodorosCompleted = snapshot.pomodorosCompleted;
  let openFocusStartedAt = options.openFocusStartedAt;
  const closedFocus: sessions.Interval[] = [];

  while (phaseEndsAt <= limit) {
    if (phase === "focus") {
      closedFocus.push({
        start:
          openFocusStartedAt ??
          new Date(phaseEndsAt.getTime() - phaseSeconds(snapshot, "focus") * 1000),
        end: phaseEndsAt,
      });
      pomodorosCompleted += 1;
      phase = cycleIndex >= snapshot.cyclesBeforeLongBreak ? "long_break" : "break";
      openFocusStartedAt = null;
    } else {
      // A long break closes the cycle, so the next focus is the first of the next cycle.
      cycleIndex = phase === "long_break" ? 1 : cycleIndex + 1;
      phase = "focus";
      openFocusStartedAt = phaseEndsAt;
    }
    phaseEndsAt = new Date(phaseEndsAt.getTime() + phaseSeconds(snapshot, phase) * 1000);
  }
  return { phase, phaseEndsAt, cycleIndex, pomodorosCompleted, closedFocus, openFocusStartedAt };
}

/** Whole seconds of focus in `intervals` (BR-012: from timestamps, never tick counts). */
export function focusSeconds(intervals: readonly sessions.Interval[]): number {
  return intervals.reduce(
    (total, interval) =>
      total + Math.floor((interval.end.getTime() - interval.start.getTime()) / 1000),
    0,
  );
}

export interface StopClassification {
  outcome: StopOutcome;
  pomodorosCompleted: number;
}

/**
 * BR-007, BR-008, FR-045, FR-058: classify a stop from the measured focus time. Under one
 * minute nothing is stored; a stopwatch from one minute is saved; a Pomodoro counts a
 * completed interval when one ran to its end or the open interval reached five minutes,
 * saves one to under five minutes of focus as time only, and discards under a minute.
 */
export function classifyStop(input: {
  mode: TimerMode;
  focusSeconds: number;
  pomodorosCompleted: number;
  openFocusSeconds: number;
}): StopClassification {
  if (input.focusSeconds < 60) return { outcome: "discarded", pomodorosCompleted: 0 };
  if (input.mode === "stopwatch") return { outcome: "saved", pomodorosCompleted: 0 };
  const openCounts = input.openFocusSeconds >= config.timer.completedFocusMinMinutes * 60;
  if (input.pomodorosCompleted > 0 || openCounts) {
    return {
      outcome: "saved",
      pomodorosCompleted: input.pomodorosCompleted + (openCounts ? 1 : 0),
    };
  }
  return { outcome: "time_only", pomodorosCompleted: 0 };
}

// ---------------------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------------------

function snapshotOf(run: RunRow): PhaseSnapshot {
  return {
    phase: run.phase ?? "focus",
    phaseEndsAt: run.phase_ends_at ?? run.started_at,
    cycleIndex: run.cycle_index,
    pomodorosCompleted: run.pomodoros_completed,
    focusMin: run.focus_min,
    breakMin: run.break_min,
    longBreakMin: run.long_break_min,
    cyclesBeforeLongBreak: run.cycles_before_long_break,
  };
}

/**
 * The wire state. `focusSeconds` is the measured study time (BR-012): the open segment is
 * counted up to `serverTime`, never from a client clock (EC-010, AC-FR-054-4). It rides on
 * the segment summary because it is exactly that, the summary of the run's focus segments;
 * without it a reloaded paused run (AC-FR-052-2) could not show the elapsed value at all.
 */
export function presentRun(
  run: RunRow,
  segments: readonly SegmentRow[],
  now: Date,
): TimerState {
  const open = segments.find((segment) => segment.ended_at === null);
  const focus = segments.reduce(
    (total, segment) =>
      total +
      Math.max(
        Math.floor(((segment.ended_at ?? now).getTime() - segment.started_at.getTime()) / 1000),
        0,
      ),
    0,
  );
  return {
    id: run.id,
    state: run.state,
    mode: run.mode,
    subjectId: run.subject_id,
    topicId: run.topic_id,
    planEntryId: run.plan_entry_id,
    phase: run.phase,
    phaseEndsAt: run.phase_ends_at === null ? null : run.phase_ends_at.toISOString(),
    cycleIndex: run.cycle_index,
    pomodorosCompleted: run.pomodoros_completed,
    focusMin: run.focus_min,
    breakMin: run.break_min,
    longBreakMin: run.long_break_min,
    cyclesBeforeLongBreak: run.cycles_before_long_break,
    startedAt: run.started_at.toISOString(),
    segments: {
      count: segments.length,
      openSegmentStartedAt: open === undefined ? null : open.started_at.toISOString(),
      focusSeconds: focus,
    },
    lastHeartbeatAt: run.last_heartbeat_at.toISOString(),
    serverTime: now.toISOString(),
    version: run.version,
  };
}

function presentSettings(row: SettingsRow | undefined): TimerSettings {
  if (row === undefined) return defaultSettings();
  return {
    focusMin: row.focus_min,
    breakMin: row.break_min,
    longBreakMin: row.long_break_min,
    cyclesBeforeLongBreak: row.cycles_before_long_break,
    audioLoop: row.audio_loop,
    audioVolume: row.audio_volume,
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
  };
}

async function readRun(
  database: Queryable,
  userId: string,
  forUpdate: boolean,
): Promise<RunRow | undefined> {
  const rows = await database.query<RunRow>(
    `${SELECT_RUN} WHERE user_id = $1${forUpdate ? " FOR UPDATE" : ""}`,
    [userId],
  );
  return rows[0];
}

async function readRunById(database: Queryable, runId: string): Promise<RunRow | undefined> {
  const rows = await database.query<RunRow>(`${SELECT_RUN} WHERE id = $1`, [runId]);
  return rows[0];
}

async function loadSegments(database: Queryable, runId: string): Promise<SegmentRow[]> {
  const rows = await database.query<SegmentRow>(
    "SELECT seq, started_at, ended_at FROM timer_run_segments WHERE run_id = $1 ORDER BY seq",
    [runId],
  );
  return rows.map((row) => ({ ...row, seq: Number(row.seq) }));
}

async function writeSegments(
  database: Queryable,
  runId: string,
  segments: readonly { readonly start: Date; readonly end: Date | null }[],
): Promise<void> {
  await database.query("DELETE FROM timer_run_segments WHERE run_id = $1", [runId]);
  let seq = 1;
  for (const segment of segments) {
    await database.query(
      "INSERT INTO timer_run_segments (run_id, seq, started_at, ended_at) VALUES ($1, $2, $3, $4)",
      [runId, seq, segment.start, segment.end],
    );
    seq += 1;
  }
}

interface Projection {
  run: RunRow;
  segments: SegmentRow[];
  moved: boolean;
}

/**
 * FR-050, BR-009: advance the run to `now` in memory. Only the phase clock moves here; the
 * focus segments follow it so the stop and every write see the same boundary instants.
 */
function project(run: RunRow, segments: readonly SegmentRow[], now: Date): Projection {
  const unchanged: Projection = { run, segments: [...segments], moved: false };
  if (run.mode !== "pomodoro" || run.state !== "running") return unchanged;
  if (run.phase === null || run.phase_ends_at === null) return unchanged;

  const open = segments.find((segment) => segment.ended_at === null);
  const advance = advancePhases(snapshotOf(run), {
    openFocusStartedAt: open?.started_at ?? null,
    now,
    cap: idleDeadline(run.last_heartbeat_at),
  });
  const moved =
    advance.closedFocus.length > 0 || (advance.openFocusStartedAt === null) !== (open === undefined);
  if (!moved) return unchanged;

  const next: SegmentRow[] = [];
  for (const segment of segments) {
    if (segment.ended_at !== null) {
      next.push({ seq: next.length + 1, started_at: segment.started_at, ended_at: segment.ended_at });
    }
  }
  for (const interval of advance.closedFocus) {
    next.push({ seq: next.length + 1, started_at: interval.start, ended_at: interval.end });
  }
  if (advance.openFocusStartedAt !== null) {
    next.push({ seq: next.length + 1, started_at: advance.openFocusStartedAt, ended_at: null });
  }
  return {
    run: {
      ...run,
      phase: advance.phase,
      phase_ends_at: advance.phaseEndsAt,
      cycle_index: advance.cycleIndex,
      pomodoros_completed: advance.pomodorosCompleted,
    },
    segments: next,
    moved: true,
  };
}

/** Persist a phase advance together with the segment boundary it produced (if it moved). */
async function persistProjection(
  database: Queryable,
  run: RunRow,
  now: Date,
): Promise<Projection> {
  const projected = project(run, await loadSegments(database, run.id), now);
  if (!projected.moved) return projected;
  await writeSegments(
    database,
    run.id,
    projected.segments.map((segment) => ({ start: segment.started_at, end: segment.ended_at })),
  );
  await database.query(
    `UPDATE timer_runs
        SET phase = $2, phase_ends_at = $3, cycle_index = $4, pomodoros_completed = $5,
            version = version + 1, updated_at = now()
      WHERE id = $1`,
    [
      run.id,
      projected.run.phase,
      projected.run.phase_ends_at,
      projected.run.cycle_index,
      projected.run.pomodoros_completed,
    ],
  );
  const updated = await readRunById(database, run.id);
  if (updated === undefined) throw new AppError("internal_error");
  return { run: updated, segments: projected.segments, moved: true };
}

// ---------------------------------------------------------------------------------------
// Links, settings row, and finalization
// ---------------------------------------------------------------------------------------

/** The active subject, refusing an archived one (BR-029, EC-007). */
async function activeSubject(
  database: Queryable,
  userId: string,
  subjectId: string,
): Promise<subjects.Subject> {
  const subject = await subjects.getSubject(database, userId, subjectId);
  if (subject.archivedAt !== null) throw new AppError("subject_archived");
  return subject;
}

/** A topic of the given subject, or `null`; anything else names the field and the rule. */
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
    // A topic that does not exist and one that belongs to somebody else answer the same
    // way, so the field never confirms that somebody else's id exists.
    throw fieldsError("topicId", "member_of_subject");
  }
  if (topic.subjectId !== subjectId) throw fieldsError("topicId", "member_of_subject");
  if (topic.archivedAt !== null) throw fieldsError("topicId", "topic_archived");
  return topic.id;
}

/** The caller's plan entry, or `null`; a foreign or missing id answers `not_found`. */
async function resolvePlanEntry(
  database: Queryable,
  userId: string,
  planEntryId: string | null,
): Promise<string | null> {
  if (planEntryId === null) return null;
  const rows = await database.query<{ id: string }>(
    "SELECT id FROM plan_entries WHERE id = $1 AND user_id = $2",
    [planEntryId, userId],
  );
  const row = rows[0];
  if (row === undefined) throw new AppError("not_found", { details: { planEntryId } });
  return row.id;
}

/** TIM-07: the user's row, or the configuration defaults at version 0 when there is none. */
async function readSettings(database: Queryable, userId: string): Promise<TimerSettings> {
  const rows = await database.query<SettingsRow>(
    `${SELECT_SETTINGS} WHERE user_id = $1`,
    [userId],
  );
  return presentSettings(rows[0]);
}

interface Finalized {
  outcome: StopOutcome;
  session: sessions.StudySession | null;
  event: sessions.SessionEvent | null;
}

/**
 * FR-040, FR-048, FR-058, BR-007, BR-008: end a run for good. The focus segments are the
 * study time, the classification decides what is stored, and the run row always goes away
 * (BR-011: one run per user, and a finished run is a session). The caller publishes the
 * returned event after its transaction commits.
 */
async function finalizeRun(
  database: Queryable,
  run: RunRow,
  endAt: Date,
  autoClosed: boolean,
  requestKey: string | null,
): Promise<Finalized> {
  const stored = await loadSegments(database, run.id);
  const intervals: sessions.Interval[] = [];
  for (const segment of stored) {
    if (segment.ended_at !== null) intervals.push({ start: segment.started_at, end: segment.ended_at });
  }

  let openStart = stored.find((segment) => segment.ended_at === null)?.started_at ?? null;
  let pomodorosCompleted = run.pomodoros_completed;
  if (run.mode === "pomodoro" && run.state === "running" && run.phase !== null && run.phase_ends_at !== null) {
    const advance = advancePhases(snapshotOf(run), {
      openFocusStartedAt: openStart,
      now: endAt,
      cap: endAt,
    });
    intervals.push(...advance.closedFocus);
    pomodorosCompleted = advance.pomodorosCompleted;
    openStart = advance.openFocusStartedAt;
  }

  let openFocusSeconds = 0;
  if (openStart !== null && openStart < endAt) {
    intervals.push({ start: openStart, end: endAt });
    openFocusSeconds = Math.floor((endAt.getTime() - openStart.getTime()) / 1000);
  }
  intervals.sort((left, right) => left.start.getTime() - right.start.getTime());

  const classification = classifyStop({
    mode: run.mode,
    focusSeconds: focusSeconds(intervals),
    pomodorosCompleted,
    openFocusSeconds,
  });

  await database.query("DELETE FROM timer_runs WHERE id = $1", [run.id]);
  if (classification.outcome === "discarded") {
    return { outcome: "discarded", session: null, event: null };
  }
  const written = await sessions.insertSession(database, run.user_id, {
    subjectId: run.subject_id,
    topicId: run.topic_id,
    planEntryId: run.plan_entry_id,
    source: "timer",
    mode: run.mode,
    intervals,
    pomodorosCompleted: classification.pomodorosCompleted,
    autoClosed,
    timezone: run.timezone,
    rolloverHour: run.day_rollover_hour,
    requestKey,
  });
  return { outcome: classification.outcome, session: written.session, event: written.event };
}

/**
 * The caller's run under lock. An idle run is refused, not extended: `settleIdleRun` has
 * already ended it at its last heartbeat in a transaction of its own (BR-006, FR-047), and
 * a command that arrives after the deadline must not add watching time to it.
 */
async function openRun(database: Queryable, userId: string, now: Date): Promise<RunRow> {
  const run = await readRun(database, userId, true);
  if (run === undefined || isIdle(run, now)) throw new AppError("session_already_closed");
  return run;
}

/** Optimistic concurrency (ADR-011): the run's version must match the caller's `If-Match`. */
function assertVersion(run: RunRow, expected: number | null, current: TimerState): void {
  if (expected === null) throw new AppError("version_required");
  if (run.version !== expected) {
    throw new AppError("stale_version", { details: { current } });
  }
}

function stopResult(outcome: StopOutcome, session: sessions.StudySession | null): StopTimerResult {
  if (outcome === "discarded") {
    return { outcome, message: "Not saved: shorter than 1 minute." };
  }
  const minutes = session === null ? 0 : Math.max(Math.round(session.durationSeconds / 60), 1);
  if (outcome === "time_only") {
    return {
      outcome,
      session: session ?? undefined,
      message: `Saved as time only: ${minutes} min of focus.`,
    };
  }
  return {
    outcome,
    session: session ?? undefined,
    message: `Saved: ${minutes} min of study.`,
  };
}

// ---------------------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------------------

/**
 * TIM-01, FR-046, FR-054: the server's view of the run, advanced to `now`. This is a read,
 * so BR-006 is only reported here: a run past its idle deadline answers `null` and the idle
 * job persists the auto-closed session on its next pass (NFR-090 bounds the lag to a minute).
 */
export async function getTimerState(
  database: Queryable,
  userId: string,
  now: Date,
): Promise<TimerState | null> {
  const run = await readRun(database, userId, false);
  if (run === undefined || isIdle(run, now)) return null;
  const projected = project(run, await loadSegments(database, run.id), now);
  return presentRun(projected.run, projected.segments, now);
}

/**
 * FR-050, FR-051, EC-002: begin a run. A second start is refused with the run in `details`,
 * and `replaceRunning` ends that run (keeping its study time) before this one begins.
 */
export async function startTimer(
  database: Queryable,
  userId: string,
  input: StartTimerInput,
  context: TimerContext,
): Promise<TimerState> {
  const events: sessions.SessionEvent[] = [];
  const existing = await readRun(database, userId, true);
  if (existing !== undefined) {
    if (isIdle(existing, context.now)) {
      const closed = await finalizeRun(database, existing, existing.last_heartbeat_at, true, null);
      if (closed.event !== null) events.push(closed.event);
    } else if (input.replaceRunning === true) {
      const closed = await finalizeRun(database, existing, context.now, false, null);
      if (closed.event !== null) events.push(closed.event);
    } else {
      const segments = await loadSegments(database, existing.id);
      const projected = project(existing, segments, context.now);
      throw new AppError("timer_already_running", {
        details: { current: presentRun(projected.run, projected.segments, context.now) },
      });
    }
  }

  const subject = await activeSubject(database, userId, input.subjectId);
  const topicId = await resolveTopic(database, userId, subject.id, input.topicId ?? null);
  const planEntryId = await resolvePlanEntry(database, userId, input.planEntryId ?? null);
  const settings = await readSettings(database, userId);

  const id = uuidv7();
  const phase: TimerPhase | null = input.mode === "pomodoro" ? "focus" : null;
  const phaseEndsAt =
    input.mode === "pomodoro" ? new Date(context.now.getTime() + settings.focusMin * 60_000) : null;
  try {
    await database.query(
      `INSERT INTO timer_runs
         (id, user_id, subject_id, topic_id, plan_entry_id, mode, state, phase, phase_ends_at,
          cycle_index, pomodoros_completed, focus_min, break_min, long_break_min,
          cycles_before_long_break, started_at, timezone, local_date, day_rollover_hour,
          last_heartbeat_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'running', $7, $8, 1, 0, $9, $10, $11, $12,
               $13, $14, $15, $16, $13)`,
      [
        id,
        userId,
        subject.id,
        topicId,
        planEntryId,
        input.mode,
        phase,
        phaseEndsAt,
        settings.focusMin,
        settings.breakMin,
        settings.longBreakMin,
        settings.cyclesBeforeLongBreak,
        context.now,
        context.timezone,
        localDateOf(context.now, context.timezone, context.rolloverHour),
        context.rolloverHour,
      ],
    );
  } catch (error) {
    // BR-011, AC-FR-053-3: a simultaneous start won the unique `user_id`, and the blocked
    // insert is what says so; the winner is committed by the time this fires, so it can be
    // named in `details.current` like any other refusal (EC-002).
    if (!isUniqueViolation(error)) throw error;
    const winner = await readRun(database, userId, false);
    const segments = winner === undefined ? [] : await loadSegments(database, winner.id);
    throw new AppError("timer_already_running", {
      details: {
        current: winner === undefined ? null : presentRun(winner, segments, context.now),
      },
    });
  }
  // The first focus interval opens with the run (BR-012); a Pomodoro break never does.
  await writeSegments(database, id, [{ start: context.now, end: null }]);
  const run = await readRunById(database, id);
  if (run === undefined) throw new AppError("internal_error");
  const state = presentRun(run, await loadSegments(database, id), context.now);
  for (const event of events) await sessions.publishSessionEvent(event);
  return state;
}

/**
 * FR-052: pause. The open focus interval closes at `now` (AC-FR-052-1: the measured time
 * stops), and the phase clock stops with it. Pausing twice changes nothing.
 */
export async function pauseTimer(
  database: Queryable,
  userId: string,
  expectedVersion: number | null,
  context: TimerContext,
): Promise<TimerState> {
  const run = await openRun(database, userId, context.now);
  const segments = await loadSegments(database, run.id);
  assertVersion(run, expectedVersion, presentRun(run, segments, context.now));
  const projected = project(run, segments, context.now);
  let state: TimerState;
  if (run.state === "paused" && !projected.moved) {
    state = presentRun(projected.run, projected.segments, context.now);
  } else {
    const next: { start: Date; end: Date | null }[] = [];
    for (const segment of projected.segments) {
      const end = segment.ended_at ?? context.now;
      if (end.getTime() > segment.started_at.getTime()) {
        next.push({ start: segment.started_at, end });
      }
    }
    await writeSegments(database, run.id, next);
    await database.query(
      `UPDATE timer_runs
          SET state = 'paused', phase = $2, phase_ends_at = $3, cycle_index = $4,
              pomodoros_completed = $5, version = version + 1, updated_at = now()
        WHERE id = $1`,
      [
        run.id,
        projected.run.phase,
        projected.run.phase_ends_at,
        projected.run.cycle_index,
        projected.run.pomodoros_completed,
      ],
    );
    const updated = await readRunById(database, run.id);
    if (updated === undefined) throw new AppError("internal_error");
    state = presentRun(updated, await loadSegments(database, run.id), context.now);
  }
  return state;
}

/**
 * FR-052: resume. The phase clock shifts by the wall time spent paused (`updated_at` is the
 * pause instant because the heartbeat never touches it), and a focus phase opens a fresh
 * interval, so the paused minutes stay out of the study time (BR-012).
 */
export async function resumeTimer(
  database: Queryable,
  userId: string,
  expectedVersion: number | null,
  context: TimerContext,
): Promise<TimerState> {
  const run = await openRun(database, userId, context.now);
  const segments = await loadSegments(database, run.id);
  assertVersion(run, expectedVersion, presentRun(run, segments, context.now));
  let state: TimerState;
  if (run.state === "running") {
    state = presentRun(run, segments, context.now);
  } else {
    const pausedMs = Math.max(context.now.getTime() - run.updated_at.getTime(), 0);
    const phaseEndsAt =
      run.phase_ends_at === null ? null : new Date(run.phase_ends_at.getTime() + pausedMs);
    const reopened = run.mode === "stopwatch" || run.phase === "focus";
    const next: { start: Date; end: Date | null }[] = segments.map((segment) => ({
      start: segment.started_at,
      end: segment.ended_at,
    }));
    if (reopened) next.push({ start: context.now, end: null });
    await writeSegments(database, run.id, next);
    await database.query(
      `UPDATE timer_runs
          SET state = 'running', phase_ends_at = $2, version = version + 1, updated_at = now()
        WHERE id = $1`,
      [run.id, phaseEndsAt],
    );
    const updated = await readRunById(database, run.id);
    if (updated === undefined) throw new AppError("internal_error");
    state = presentRun(updated, await loadSegments(database, run.id), context.now);
  }
  return state;
}

/**
 * FR-058, BR-007, BR-008: stop and store. The outcome travels with the session so the client
 * can say "Saved" or "Not saved" (FR-045) without guessing.
 */
export async function stopTimer(
  database: Queryable,
  userId: string,
  expectedVersion: number | null,
  context: TimerContext,
  requestKey: string | null,
): Promise<StopTimerResult> {
  const run = await openRun(database, userId, context.now);
  const segments = await loadSegments(database, run.id);
  assertVersion(run, expectedVersion, presentRun(run, segments, context.now));
  const finalized = await finalizeRun(database, run, context.now, false, requestKey);
  if (finalized.event !== null) await sessions.publishSessionEvent(finalized.event);
  return stopResult(finalized.outcome, finalized.session);
}

/**
 * TIM-06, FR-046, BR-006: liveness. The heartbeat advances the run and moves only
 * `last_heartbeat_at`; it deliberately leaves `updated_at` alone, because that column is the
 * pause instant `resumeTimer` shifts the phase clock by.
 */
export async function heartbeatTimer(
  database: Queryable,
  userId: string,
  context: TimerContext,
): Promise<TimerState> {
  const run = await openRun(database, userId, context.now);
  const projected = await persistProjection(database, run, context.now);
  await database.query("UPDATE timer_runs SET last_heartbeat_at = $2 WHERE id = $1", [
    run.id,
    context.now,
  ]);
  const updated = await readRunById(database, run.id);
  if (updated === undefined) throw new AppError("internal_error");
  return presentRun(updated, projected.segments, context.now);
}

/**
 * TIM-07: the settings the A-3 screen shows. No row yet answers the configuration defaults
 * at version 0 (NFR-062), so a first start needs no write.
 */
export async function getTimerSettings(database: Queryable, userId: string): Promise<TimerSettings> {
  return readSettings(database, userId);
}

const SETTINGS_RANGES = [
  ["focusMin", 1, 120],
  ["breakMin", 1, 60],
  ["longBreakMin", 1, 60],
  ["cyclesBeforeLongBreak", 2, 8],
  ["audioVolume", 0, 100],
] as const;

function validateSettings(settings: Omit<TimerSettings, "version" | "updatedAt">): void {
  for (const [path, min, max] of SETTINGS_RANGES) {
    const value = settings[path];
    if (value < min || value > max) throw fieldsError(path, "range", { min, max });
  }
}

/**
 * TIM-08, FR-057: durations and Phase 2 audio. A run already in flight keeps the snapshot it
 * started with (`timer_runs.focus_min`), so changing settings never moves a live countdown.
 * The row is created lazily at version 1, which is why the first call may omit `If-Match`.
 */
export async function updateTimerSettings(
  database: Queryable,
  userId: string,
  expectedVersion: number | null,
  input: UpdateTimerSettingsInput,
): Promise<TimerSettings> {
  if (Object.values(input).every((value) => value === undefined)) {
    throw new AppError("validation_failed", {
      details: { fields: [{ path: "body", rule: "at_least_one_field" }] },
    });
  }
  const rows = await database.query<SettingsRow>(
    `${SELECT_SETTINGS} WHERE user_id = $1 FOR UPDATE`,
    [userId],
  );
  const existing = rows[0];
  if (existing === undefined) {
    if (expectedVersion !== null && expectedVersion !== 0) {
      throw new AppError("stale_version", { details: { current: presentSettings(undefined) } });
    }
  } else if (expectedVersion === null) {
    throw new AppError("version_required");
  } else if (existing.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current: presentSettings(existing) } });
  }

  const current = presentSettings(existing);
  const next = {
    focusMin: input.focusMin ?? current.focusMin,
    breakMin: input.breakMin ?? current.breakMin,
    longBreakMin: input.longBreakMin ?? current.longBreakMin,
    cyclesBeforeLongBreak: input.cyclesBeforeLongBreak ?? current.cyclesBeforeLongBreak,
    audioLoop: input.audioLoop ?? current.audioLoop,
    audioVolume: input.audioVolume ?? current.audioVolume,
  };
  validateSettings(next);

  if (existing === undefined) {
    await database.query(
      `INSERT INTO timer_settings
         (user_id, focus_min, break_min, long_break_min, cycles_before_long_break, audio_loop,
          audio_volume)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        next.focusMin,
        next.breakMin,
        next.longBreakMin,
        next.cyclesBeforeLongBreak,
        next.audioLoop,
        next.audioVolume,
      ],
    );
  } else {
    await database.query(
      `UPDATE timer_settings
          SET focus_min = $2, break_min = $3, long_break_min = $4,
              cycles_before_long_break = $5, audio_loop = $6, audio_volume = $7,
              version = version + 1, updated_at = now()
        WHERE user_id = $1`,
      [
        userId,
        next.focusMin,
        next.breakMin,
        next.longBreakMin,
        next.cyclesBeforeLongBreak,
        next.audioLoop,
        next.audioVolume,
      ],
    );
  }
  return readSettings(database, userId);
}

// ---------------------------------------------------------------------------------------
// Idle close (BR-006, FR-047), purge, export, and the archive guard (EC-007)
// ---------------------------------------------------------------------------------------

/**
 * BR-006, AC-FR-059-1: a run silent past the idle window ends at its last heartbeat and is
 * flagged auto-closed, never at `now` (NFR-090); a run below a minute of focus is discarded
 * like any other stop (BR-007). The close has a transaction of its own on purpose: the
 * command that discovers an idle run refuses right after this, and that refusal must not
 * roll the session back. Returns the outcome, or null when there was nothing to close.
 */
export async function settleIdleRun(
  database: Database,
  userId: string,
  now: Date,
): Promise<StopOutcome | null> {
  const candidate = await readRun(database, userId, false);
  if (candidate === undefined || !isIdle(candidate, now)) return null;
  const events: sessions.SessionEvent[] = [];
  const outcome = await database.transaction(async (tx) => {
    const run = await readRun(tx, userId, true);
    if (run === undefined || !isIdle(run, now)) return null;
    const finalized = await finalizeRun(tx, run, run.last_heartbeat_at, true, null);
    if (finalized.event !== null) events.push(finalized.event);
    return finalized.outcome;
  });
  for (const event of events) await sessions.publishSessionEvent(event);
  return outcome;
}

/** The scheduled sweep: every user whose run passed the idle deadline, one at a time. */
export async function closeIdleRuns(
  database: Database,
  now: Date,
): Promise<{ closed: number; discarded: number }> {
  const deadline = new Date(now.getTime() - config.timer.idleCloseMinutes * 60_000);
  const rows = await database.query<{ user_id: string }>(
    "SELECT user_id FROM timer_runs WHERE last_heartbeat_at < $1 ORDER BY last_heartbeat_at",
    [deadline],
  );
  let closed = 0;
  let discarded = 0;
  for (const row of rows) {
    const outcome = await settleIdleRun(database, row.user_id, now);
    if (outcome === null) continue;
    if (outcome === "discarded") discarded += 1;
    else closed += 1;
  }
  return { closed, discarded };
}

/** Registered purge handler (FR-130): the live run and the settings row. */
export async function purgeTimer(userId: string, database: Queryable): Promise<number> {
  const rows = await database.query<{ id: string }>(
    "DELETE FROM timer_runs WHERE user_id = $1 RETURNING id",
    [userId],
  );
  await database.query("DELETE FROM timer_settings WHERE user_id = $1", [userId]);
  return rows.length;
}

/** Registered export contributor (FR-130, FR-131). */
export async function exportTimer(userId: string, database: Queryable): Promise<unknown[]> {
  return database.query<Record<string, unknown>>(
    `SELECT r.id, r.subject_id, r.topic_id, r.plan_entry_id, r.mode, r.state, r.phase,
            r.phase_ends_at, r.cycle_index, r.pomodoros_completed, r.focus_min, r.break_min,
            r.long_break_min, r.cycles_before_long_break, r.started_at, r.timezone,
            r.local_date::text, r.last_heartbeat_at, r.created_at, r.updated_at
       FROM timer_runs r WHERE r.user_id = $1 ORDER BY r.started_at, r.id`,
    [userId],
  );
}

/** SUBJ-06, EC-007: a live run on the subject blocks archiving and names itself. */
export function registerTimerArchiveGuard(database: Queryable): void {
  if (archiveGuards.has("timer")) return;
  archiveGuards.register("timer", async (subjectId) => {
    const rows = await database.query<{ id: string }>(
      "SELECT id FROM timer_runs WHERE subject_id = $1 LIMIT 1",
      [subjectId],
    );
    const row = rows[0];
    if (row === undefined) return { blocked: false };
    return { blocked: true, details: { timerRunId: row.id } };
  });
}
