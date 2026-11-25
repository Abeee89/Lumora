/**
 * Goals (FR-070..FR-074): one dated daily target per user (BR-013, BR-015), optional
 * per-subject targets (FR-071), and progress derived from the frozen local dates of the day
 * allocations Study sessions records (BR-014).
 *
 * No progress figure is stored. A session write, a target change or a profile timezone
 * change all change the answer, so every read recomputes it and nothing has to be
 * invalidated (FR-072, EC-006). The daily target is a dated history, so a change applies
 * from the local day it was made and past days keep the target in force on them (FR-074).
 */
import { config } from "../../kernel/config";
import type { Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import { localDateOf, type LocalDate } from "../../kernel/time";
import * as sessions from "../sessions/public";
import * as subjects from "../subjects/public";
import * as timer from "../timer/public";
import { publishGoalEvent } from "./events";

/** `DailyGoal`, `SubjectGoal`, `GoalSet` and `GoalProgress` are API-SCHEMAS section 14. */
export interface DailyGoal {
  targetMinutes: number;
  /** First local day this target applies (FR-074). */
  effectiveFrom: LocalDate;
}

export interface SubjectGoal {
  subjectId: string;
  targetMinutes: number;
  /** AC-FR-071-4: an archived subject keeps its target, suspended until it is restored. */
  subjectArchived: boolean;
}

export interface GoalSet {
  daily: DailyGoal;
  subjects: SubjectGoal[];
}

export interface SubjectGoalProgress {
  subjectId: string;
  minutes: number;
  targetMinutes: number;
  percent: number;
  goalMet: boolean;
}

export interface GoalProgress {
  date: LocalDate;
  minutes: number;
  targetMinutes: number;
  percent: number;
  goalMet: boolean;
  subjects: SubjectGoalProgress[];
}

/** The caller's clock context, built by the adapter from User profile (BR-014). */
export interface GoalContext {
  now: Date;
  timezone: string;
  rolloverHour: number;
}

interface HistoryRow {
  effective_from: string;
  target_minutes: number;
}

interface GoalRow {
  subject_id: string;
  target_minutes: number;
}

interface DayState {
  minutes: number;
  targetMinutes: number;
  percent: number;
  goalMet: boolean;
  subjects: SubjectGoalProgress[];
}

/** BR-013, EC-023: whole minutes 5..1440; a refusal leaves the stored value alone. */
export function assertTargetMinutes(value: number): number {
  const { minMinutes, maxMinutes } = config.goal;
  if (!Number.isInteger(value) || value < minMinutes || value > maxMinutes) {
    throw new AppError("goal_out_of_range", { details: { min: minMinutes, max: maxMinutes } });
  }
  return value;
}

/**
 * BR-015: the target in force on `date` is the row with the greatest `effective_from` on or
 * before it. A date before every row answers the earliest one, because an account has a row
 * from its registration local date and no study day precedes it; an empty history answers
 * the configured default (BR-013), so a settings form always has a value to show.
 */
export function targetForDay(history: readonly DailyGoal[], date: LocalDate): DailyGoal {
  let inForce: DailyGoal | null = null;
  for (const row of history) {
    if (row.effectiveFrom <= date && (inForce === null || row.effectiveFrom > inForce.effectiveFrom)) {
      inForce = row;
    }
  }
  if (inForce !== null) return inForce;
  const earliest = history[0];
  return {
    targetMinutes: earliest?.targetMinutes ?? config.goal.defaultMinutes,
    effectiveFrom: date,
  };
}

/** FR-072: whole percent, never clamped, so 150% stays a real answer. */
export function percentOf(minutes: number, targetMinutes: number): number {
  return Math.round((minutes * 100) / targetMinutes);
}

/** BR-015, FR-073: a day is met when its minutes reach the target in force on it. */
export function isGoalMet(minutes: number, targetMinutes: number): boolean {
  return minutes >= targetMinutes;
}

/** APPLICATION-FLOWS section 7 step 5: only a crossing publishes, so a met day fires once. */
export function goalMetCrossed(input: {
  beforeMinutes: number;
  beforeTargetMinutes: number;
  minutes: number;
  targetMinutes: number;
}): boolean {
  return (
    !isGoalMet(input.beforeMinutes, input.beforeTargetMinutes) &&
    isGoalMet(input.minutes, input.targetMinutes)
  );
}

function minutesOf(seconds: number): number {
  return Math.floor(seconds / 60);
}

function todayOf(context: GoalContext): LocalDate {
  return localDateOf(context.now, context.timezone, context.rolloverHour);
}

async function readHistory(database: Queryable, userId: string): Promise<DailyGoal[]> {
  const rows = await database.query<HistoryRow>(
    `SELECT effective_from::text, target_minutes
     FROM daily_goal_history
     WHERE user_id = $1
     ORDER BY effective_from`,
    [userId],
  );
  return rows.map((row) => ({
    effectiveFrom: row.effective_from,
    targetMinutes: row.target_minutes,
  }));
}

/** BR-015 read for one day; the session subscriber and the progress read both use it. */
export async function targetMinutesFor(
  database: Queryable,
  userId: string,
  date: LocalDate,
): Promise<number> {
  return targetForDay(await readHistory(database, userId), date).targetMinutes;
}

/**
 * The caller's subjects in their own order, plus which of them are archived, so a goal list
 * is stable and an archived subject is marked rather than dropped (FR-071, AC-FR-071-4).
 */
async function subjectIndex(
  database: Queryable,
  userId: string,
): Promise<{ order: Map<string, number>; archived: Map<string, boolean> }> {
  const list = await subjects.listSubjects(database, userId, true);
  return {
    order: new Map(list.map((subject, index) => [subject.id, index])),
    archived: new Map(list.map((subject) => [subject.id, subject.archivedAt !== null])),
  };
}

function readSubjectGoals(database: Queryable, userId: string): Promise<GoalRow[]> {
  return database.query<GoalRow>(
    "SELECT subject_id, target_minutes FROM subject_goals WHERE user_id = $1",
    [userId],
  );
}

/** GOAL-01 (FR-070, FR-071): the target in force today and every subject target. */
export async function getGoalSet(
  database: Queryable,
  userId: string,
  context: GoalContext,
): Promise<GoalSet> {
  const [history, goals, index] = await Promise.all([
    readHistory(database, userId),
    readSubjectGoals(database, userId),
    subjectIndex(database, userId),
  ]);
  const position = (subjectId: string) => index.order.get(subjectId) ?? 0;
  return {
    daily: targetForDay(history, todayOf(context)),
    subjects: [...goals]
      .sort((left, right) => position(left.subject_id) - position(right.subject_id))
      .map((row) => ({
        subjectId: row.subject_id,
        targetMinutes: row.target_minutes,
        subjectArchived: index.archived.get(row.subject_id) ?? false,
      })),
  };
}

/**
 * GOAL-02 (FR-070, FR-074): the new target applies to the current local day and later days.
 * A second change on the same day rewrites that day's row, so no extra history entry leaks
 * into the past (AC-FR-074-3, EC-005).
 */
export async function setDailyGoal(
  database: Queryable,
  userId: string,
  targetMinutes: number,
  context: GoalContext,
): Promise<DailyGoal> {
  const target = assertTargetMinutes(targetMinutes);
  const today = todayOf(context);
  const before = await dayState(database, userId, today, context);

  const rows = await database.query<HistoryRow>(
    `INSERT INTO daily_goal_history (user_id, effective_from, target_minutes)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, effective_from)
     DO UPDATE SET target_minutes = EXCLUDED.target_minutes, updated_at = now()
     RETURNING effective_from::text, target_minutes`,
    [userId, today, target],
  );
  const row = rows[0];
  if (row === undefined) throw new AppError("internal_error");
  const written: DailyGoal = {
    targetMinutes: row.target_minutes,
    effectiveFrom: row.effective_from,
  };

  // AC-FR-074-2: lowering the target can make the current day met at once, and
  // APPLICATION-FLOWS section 7 lists a goal change among the GoalMet triggers. The
  // minutes do not move, only the target, so the before minutes are still current.
  if (
    goalMetCrossed({
      beforeMinutes: before.minutes,
      beforeTargetMinutes: before.targetMinutes,
      minutes: before.minutes,
      targetMinutes: written.targetMinutes,
    })
  ) {
    await publishGoalEvent({
      type: "GoalMet",
      userId,
      localDate: today,
      minutes: before.minutes,
      targetMinutes: written.targetMinutes,
      occurredAt: context.now.toISOString(),
    });
  }

  return written;
}

/**
 * GOAL-03 (FR-071): one target per subject, above the overall goal if the user wants it.
 * An archived subject is refused, because its target would be suspended anyway (BR-029).
 */
export async function setSubjectGoal(
  database: Queryable,
  userId: string,
  subjectId: string,
  targetMinutes: number,
): Promise<SubjectGoal> {
  const target = assertTargetMinutes(targetMinutes);
  const subject = await subjects.getSubject(database, userId, subjectId);
  if (subject.archivedAt !== null) throw new AppError("subject_archived");

  await database.query(
    `INSERT INTO subject_goals (user_id, subject_id, target_minutes)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, subject_id)
     DO UPDATE SET target_minutes = EXCLUDED.target_minutes, updated_at = now()`,
    [userId, subjectId, target],
  );
  return { subjectId, targetMinutes: target, subjectArchived: false };
}

/** GOAL-04 (FR-071): idempotent, and allowed while the subject is archived. */
export async function removeSubjectGoal(
  database: Queryable,
  userId: string,
  subjectId: string,
): Promise<void> {
  await subjects.getSubject(database, userId, subjectId);
  await database.query("DELETE FROM subject_goals WHERE user_id = $1 AND subject_id = $2", [
    userId,
    subjectId,
  ]);
}

/**
 * One local day at a time: the frozen allocations of that day, the live run's focus when the
 * day is today (AC-FR-072-2), the target in force on it (BR-015) and every subject target
 * that is not suspended (FR-071).
 */
async function dayState(
  database: Queryable,
  userId: string,
  date: LocalDate,
  context: GoalContext,
): Promise<DayState> {
  const [history, goals, index, allocations] = await Promise.all([
    readHistory(database, userId),
    readSubjectGoals(database, userId),
    subjectIndex(database, userId),
    sessions.daySeconds(database, userId, date),
  ]);

  const secondsBySubject = new Map<string, number>();
  let totalSeconds = 0;
  for (const row of allocations) {
    totalSeconds += row.seconds;
    secondsBySubject.set(row.subjectId, (secondsBySubject.get(row.subjectId) ?? 0) + row.seconds);
  }
  if (date === todayOf(context)) {
    const running = await timer.runningFocus(database, userId, context.now);
    if (running !== null && running.localDate === date) {
      totalSeconds += running.seconds;
      secondsBySubject.set(
        running.subjectId,
        (secondsBySubject.get(running.subjectId) ?? 0) + running.seconds,
      );
    }
  }

  const minutes = minutesOf(totalSeconds);
  const target = targetForDay(history, date).targetMinutes;
  const position = (subjectId: string) => index.order.get(subjectId) ?? 0;
  const subjectProgress = goals
    .filter((row) => index.archived.get(row.subject_id) === false)
    .sort((left, right) => position(left.subject_id) - position(right.subject_id))
    .map((row) => {
      const subjectMinutes = minutesOf(secondsBySubject.get(row.subject_id) ?? 0);
      return {
        subjectId: row.subject_id,
        minutes: subjectMinutes,
        targetMinutes: row.target_minutes,
        percent: percentOf(subjectMinutes, row.target_minutes),
        goalMet: isGoalMet(subjectMinutes, row.target_minutes),
      };
    });

  return {
    minutes,
    targetMinutes: target,
    percent: percentOf(minutes, target),
    goalMet: isGoalMet(minutes, target),
    subjects: subjectProgress,
  };
}

/** GOAL-05 (FR-072, FR-073): minutes against the target in force on one local day. */
export async function getGoalProgress(
  database: Queryable,
  userId: string,
  date: LocalDate,
  context: GoalContext,
): Promise<GoalProgress> {
  return { date, ...(await dayState(database, userId, date, context)) };
}

/**
 * AUTH-01 (BR-013): the row an account starts with, on its registration local date. The
 * profile row is created with the default rollover hour 0, so the zone alone decides. The
 * guard makes this safe to call on every sign-in path: an account that already has history
 * keeps it, so a later visit can never reset the target to the default.
 */
export async function seedDailyGoal(
  database: Queryable,
  input: { userId: string; timezone: string; now: Date },
): Promise<void> {
  await database.query(
    `INSERT INTO daily_goal_history (user_id, effective_from, target_minutes)
     SELECT $1, $2, $3
     WHERE NOT EXISTS (SELECT 1 FROM daily_goal_history WHERE user_id = $1)`,
    [input.userId, localDateOf(input.now, input.timezone, 0), config.goal.defaultMinutes],
  );
}

/** Registered purge handler (NFR-031): subject goals first, then the target history. */
export async function purgeGoals(userId: string, database: Queryable): Promise<number> {
  const goals = await database.query<{ subject_id: string }>(
    "DELETE FROM subject_goals WHERE user_id = $1 RETURNING subject_id",
    [userId],
  );
  const history = await database.query<{ effective_from: string }>(
    "DELETE FROM daily_goal_history WHERE user_id = $1 RETURNING effective_from",
    [userId],
  );
  return goals.length + history.length;
}

/** Registered export contributor (FR-130, FR-131): both tables, tagged by kind. */
export async function exportGoals(userId: string, database: Queryable): Promise<unknown[]> {
  return database.query<Record<string, unknown>>(
    `SELECT 'daily' AS kind, NULL::uuid AS subject_id, effective_from::text AS effective_from,
            target_minutes, created_at, updated_at
       FROM daily_goal_history WHERE user_id = $1
     UNION ALL
     SELECT 'subject', subject_id, NULL::text, target_minutes, created_at, updated_at
       FROM subject_goals WHERE user_id = $1
     ORDER BY kind, effective_from, subject_id`,
    [userId],
  );
}
