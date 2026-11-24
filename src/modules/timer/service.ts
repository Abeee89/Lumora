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
import { localDateOf } from "../../kernel/time";
import * as plans from "../plans/public";
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
