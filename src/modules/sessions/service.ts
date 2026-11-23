/**
 * Study sessions (FR-040..FR-048, FR-061): the recorded facts of study, sourced from a
 * timer or entered by hand. This module owns the per-local-day allocation (BR-016,
 * FR-047), the no-overlap rule (EC-011), the manual flag and the ranking rule (BR-010,
 * EC-025), and publishes the completion, edit and delete events that later milestones
 * (XP, statistics) subscribe to.
 *
 * `StudySession` is the wire shape of API-SCHEMAS section 9.
 */
import { config } from "../../kernel/config";
import { uuidv7 } from "../../kernel/crypto";
import type { Database, Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import { localDateOf, localDayRange, type LocalDate } from "../../kernel/time";
import * as subjects from "../subjects/public";
import * as topics from "../topics/public";
import { publishSessionEvent } from "./events";

export type SessionSource = "timer" | "manual";
export type SessionMode = "stopwatch" | "pomodoro";

export interface DayAllocation {
  localDate: LocalDate;
  seconds: number;
  isManual: boolean;
}

export interface StudySession {
  id: string;
  subjectId: string;
  topicId: string | null;
  planEntryId: string | null;
  source: SessionSource;
  mode: SessionMode | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  pomodorosCompleted: number;
  autoClosed: boolean;
  timezone: string;
  localDate: LocalDate;
  dayAllocations: DayAllocation[];
  serverTime?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** What the module needs to know about the caller's clock and zone (BR-030). */
export interface SessionContext {
  now: Date;
  timezone: string;
  rolloverHour: number;
}

export interface CreateSessionInput {
  subjectId: string;
  topicId?: string | null | undefined;
  planEntryId?: string | null | undefined;
  startedAt: string;
  endedAt: string;
}

export interface UpdateSessionInput {
  subjectId?: string | undefined;
  topicId?: string | null | undefined;
  planEntryId?: string | null | undefined;
  startedAt?: string | undefined;
  endedAt?: string | undefined;
}

/** SESS-01 query: an optional date window plus two filters, cursor paginated (FR-061). */
export interface SessionListQuery {
  from?: LocalDate | undefined;
  to?: LocalDate | undefined;
  subjectId?: string | undefined;
  topicId?: string | undefined;
  source?: SessionSource | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
}

export interface SessionPage {
  data: StudySession[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SessionRow {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  plan_entry_id: string | null;
  source: SessionSource;
  mode: SessionMode | null;
  started_at: Date;
  ended_at: Date;
  duration_seconds: number;
  pomodoros_completed: number;
  auto_closed: boolean;
  timezone: string;
  local_date: string;
  version: number;
  created_at: Date;
  updated_at: Date;
  /** NULL when the allocation read is skipped. */
  allocations?: DayAllocation[] | null;
}

const SELECT_SESSION = `
  SELECT s.id, s.user_id, s.subject_id, s.topic_id, s.plan_entry_id, s.source, s.mode,
         s.started_at, s.ended_at, s.duration_seconds, s.pomodoros_completed, s.auto_closed,
         s.timezone, s.local_date::text, s.version, s.created_at, s.updated_at
  FROM study_sessions s`;

const ALLOCATION_SELECT = `
  SELECT d.local_date::text, d.seconds, d.is_manual
  FROM study_session_days d
  WHERE d.session_id = $1
  ORDER BY d.local_date`;

function fieldsError(path: string, rule: string, extra: Record<string, unknown> = {}): AppError {
  return new AppError("validation_failed", { details: { fields: [{ path, rule, ...extra }] } });
}

function validateInstant(value: string, path: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw fieldsError(path, "instant");
  return parsed;
}

function validateDuration(seconds: number): number {
  if (!Number.isInteger(seconds) || seconds < config.timer.completedFocusMinMinutes * 60 || seconds > 86_400) {
    throw new AppError("manual_entry_too_long", {
      details: { minSeconds: config.timer.completedFocusMinMinutes * 60, maxSeconds: 86_400 },
    });
  }
  return seconds;
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

/** The active subject, refusing an archived one (BR-029, EC-007). */
async function activeSubject(database: Queryable, userId: string, subjectId: string): Promise<subjects.Subject> {
  const subject = await subjects.getSubject(database, userId, subjectId);
  if (subject.archivedAt !== null) {
    throw new AppError("subject_archived", { details: { subjectId: subject.id } });
  }
  return subject;
}

export interface Interval {
  start: Date;
  end: Date;
}

/**
 * BR-016, FR-047: split `[start, end)` at each study-day boundary of the frozen zone and
 * rollover hour. A DST day of 23 or 25 hours is a single boundary at its rollover wall
 * time, so the UTC durations per day still add up to the total (AC-FR-047-3, EC-006).
 */
export function dayIntervals(
  start: Date,
  end: Date,
  timeZone: string,
  rolloverHour: number,
): Interval[] {
  const parts: Interval[] = [];
  let cursor = start;
  while (cursor < end) {
    const day = localDateOf(cursor, timeZone, rolloverHour);
    const boundary = localDayRange(day, timeZone, rolloverHour).end;
    const partEnd = boundary < end ? boundary : end;
    parts.push({ start: cursor, end: partEnd });
    cursor = partEnd;
  }
  return parts;
}

/**
 * The seconds per local day, keyed by the frozen local date. Each allocation is at least
 * one second, so a session that touches a day only contributes a positive slice.
 */
export function allocateDays(
  start: Date,
  end: Date,
  timeZone: string,
  rolloverHour: number,
  isManual: boolean,
): DayAllocation[] {
  return dayIntervals(start, end, timeZone, rolloverHour).map((part) => ({
    localDate: localDateOf(part.start, timeZone, rolloverHour),
    seconds: Math.floor((part.end.getTime() - part.start.getTime()) / 1000),
    isManual,
  }));
}

/**
 * The total of the caller's allocations on one local day, so the 24 h cap reads existing
 * rows plus the candidate slices before anything is written (EC-011, AC-FR-042-4).
 */
async function dayTotals(
  database: Queryable,
  userId: string,
  days: readonly LocalDate[],
  excludeSessionId: string | null,
): Promise<Map<string, number>> {
  if (days.length === 0) return new Map();
  const totals = new Map<string, number>(days.map((day) => [day, 0]));
  const rows = await database.query<{ local_date: string; seconds: number }>(
    `SELECT d.local_date::text, sum(d.seconds)::int AS seconds
     FROM study_session_days d
     WHERE d.user_id = $1 AND d.local_date = ANY($2::date[])
       AND ($3::uuid IS NULL OR d.session_id <> $3::uuid)
     GROUP BY d.local_date`,
    [userId, [...days], excludeSessionId],
  );
  for (const row of rows) totals.set(row.local_date, row.seconds);
  return totals;
}

function present(row: SessionRow): StudySession {
  return {
    id: row.id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    planEntryId: row.plan_entry_id,
    source: row.source,
    mode: row.mode,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at.toISOString(),
    durationSeconds: row.duration_seconds,
    pomodorosCompleted: row.pomodoros_completed,
    autoClosed: row.auto_closed,
    timezone: row.timezone,
    localDate: row.local_date,
    dayAllocations: row.allocations ?? [],
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function withAllocations(database: Queryable, session: StudySession): Promise<StudySession> {
  const rows = await database.query<{ local_date: string; seconds: number; is_manual: boolean }>(
    ALLOCATION_SELECT,
    [session.id],
  );
  return {
    ...session,
    dayAllocations: rows.map((row) => ({
      localDate: row.local_date,
      seconds: row.seconds,
      isManual: row.is_manual,
    })),
  };
}

async function findSession(
  database: Queryable,
  userId: string,
  sessionId: string,
): Promise<StudySession | undefined> {
  const rows = await database.query<SessionRow>(
    `${SELECT_SESSION} WHERE s.id = $1 AND s.user_id = $2`,
    [sessionId, userId],
  );
  const row = rows[0];
  if (row === undefined) return undefined;
  return present(row);
}

/** SESS-02. */
export async function getSession(
  database: Queryable,
  userId: string,
  sessionId: string,
): Promise<StudySession> {
  const session = await findSession(database, userId, sessionId);
  if (session === undefined) throw new AppError("not_found");
  return withAllocations(database, session);
}

export interface SessionWrite {
  session: StudySession;
  event:
    | { type: "SessionCompleted"; sessionId: string; userId: string; subjectId: string; occurredAt: string }
    | { type: "SessionEdited"; sessionId: string; userId: string; subjectId: string; occurredAt: string }
    | { type: "SessionDeleted"; sessionId: string; userId: string; subjectId: string; occurredAt: string };
}

function eventOf(
  type: SessionWrite["event"]["type"],
  row: { id: string; user_id: string; subject_id: string },
): SessionWrite["event"] {
  return { type, sessionId: row.id, userId: row.user_id, subjectId: row.subject_id, occurredAt: new Date().toISOString() };
}

/**
 * The checks every manual write and every timer stop run against the candidate range:
 * the future rule, the 60..86400 s duration, the per-day 24 h cap and the overlap rule
 * naming the conflicting session (EC-011). Returns the allocations the write will store.
 */
async function validateWrite(
  database: Queryable,
  userId: string,
  candidate: { startedAt: Date; endedAt: Date; timezone: string; rolloverHour: number; isManual: boolean },
  excludeSessionId: string | null,
): Promise<DayAllocation[]> {
  const { startedAt, endedAt } = candidate;
  if (endedAt.getTime() <= startedAt.getTime()) throw fieldsError("endedAt", "after_start");
  const duration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
  if (duration < 60 || duration > 86_400) {
    throw new AppError("manual_entry_too_long", { details: { minSeconds: 60, maxSeconds: 86_400 } });
  }

  const allocations = allocateDays(startedAt, endedAt, candidate.timezone, candidate.rolloverHour, candidate.isManual);
  const dayTotalsMap = await dayTotals(
    database,
    userId,
    allocations.map((allocation) => allocation.localDate),
    excludeSessionId,
  );
  const violated = allocations.find(
    (allocation) => (dayTotalsMap.get(allocation.localDate) ?? 0) + allocation.seconds > 86_400,
  );
  if (violated !== undefined) {
    throw new AppError("daily_total_exceeded", {
      details: { localDate: violated.localDate, maxSeconds: 86_400 },
    });
  }

  const conflicting = await database.query<{ id: string }>(
    `SELECT s.id
     FROM study_sessions s
     WHERE s.user_id = $1
       AND s.started_at < $3
       AND $2 < s.ended_at
       AND ($4::uuid IS NULL OR s.id <> $4::uuid)
     ORDER BY s.started_at, s.id
     LIMIT 1`,
    [userId, startedAt, endedAt, excludeSessionId],
  );
  const conflict = conflicting[0];
  if (conflict !== undefined) {
    throw new AppError("manual_entry_overlaps_session", { details: { conflictingSessionId: conflict.id } });
  }
  return allocations;
}

/**
 * The INSERT shared by the manual create and the timer stop: the overlap and daily cap
 * checks run inside the caller's transaction, and the exclusion constraint is the final
 * guard against a race between two writers (EC-011, ADR-011).
 */
export async function insertSession(
  database: Queryable,
  userId: string,
  input: {
    subjectId: string;
    topicId: string | null;
    planEntryId: string | null;
    source: SessionSource;
    mode: SessionMode | null;
    startedAt: Date;
    endedAt: Date;
    pomodorosCompleted: number;
    autoClosed: boolean;
    timezone: string;
    rolloverHour: number;
    requestKey: string | null;
  },
): Promise<{ session: StudySession; event: SessionWrite["event"] }> {
  const duration = Math.floor((input.endedAt.getTime() - input.startedAt.getTime()) / 1000);
  if (duration < 60 || duration > 86_400) {
    throw new AppError("manual_entry_too_long", { details: { minSeconds: 60, maxSeconds: 86_400 } });
  }
  const allocations = allocateDays(
    input.startedAt,
    input.endedAt,
    input.timezone,
    input.rolloverHour,
    input.source === "manual",
  );
  const id = uuidv7();
  const localDate = localDateOf(input.startedAt, input.timezone, input.rolloverHour);
  await database.query(
    `INSERT INTO study_sessions
       (id, user_id, subject_id, topic_id, plan_entry_id, source, mode, started_at, ended_at,
        duration_seconds, pomodoros_completed, auto_closed, timezone, local_date,
        day_rollover_hour, request_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      id, userId, input.subjectId, input.topicId, input.planEntryId, input.source, input.mode,
      input.startedAt, input.endedAt, duration, input.pomodorosCompleted, input.autoClosed,
      input.timezone, localDate, input.rolloverHour, input.requestKey,
    ],
  );
  for (const allocation of allocations) {
    await database.query(
      `INSERT INTO study_session_days (session_id, local_date, user_id, subject_id, seconds, is_manual, is_ranked)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        allocation.localDate,
        userId,
        input.subjectId,
        allocation.seconds,
        allocation.isManual,
        input.source === "timer" && duration >= 300,
      ],
    );
  }
  const rows = await database.query<SessionRow>(`${SELECT_SESSION} WHERE s.id = $1`, [id]);
  const row = rows[0];
  if (row === undefined) throw new AppError("internal_error");
  return {
    session: { ...present(row), dayAllocations: allocations },
    event: eventOf("SessionCompleted", row),
  };
}
/** SESS-03 (FR-042, FR-048): a hand-recorded past session, idempotent by request key. */
export async function createManualSession(
  database: Queryable,
  userId: string,
  input: CreateSessionInput,
  ctx: SessionContext,
  requestKey: string | null,
): Promise<{ session: StudySession; event: SessionWrite["event"] }> {
  const subject = await activeSubject(database, userId, input.subjectId);
  const topicId = await resolveTopic(database, userId, subject.id, input.topicId ?? null);
  const planEntryId = await resolvePlanEntry(database, userId, input.planEntryId ?? null);

  const startedAt = validateInstant(input.startedAt, "startedAt");
  const endedAt = validateInstant(input.endedAt, "endedAt");
  if (startedAt.getTime() > ctx.now.getTime()) {
    throw new AppError("manual_entry_in_future", { details: { now: ctx.now.toISOString() } });
  }
  if (endedAt.getTime() > ctx.now.getTime()) {
    throw new AppError("manual_entry_in_future", { details: { now: ctx.now.toISOString() } });
  }
  if (endedAt.getTime() <= startedAt.getTime()) throw fieldsError("endedAt", "after_start");
  const duration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
  validateDuration(duration);
  await validateWrite(
    database,
    userId,
    {
      startedAt,
      endedAt,
      timezone: ctx.timezone,
      rolloverHour: ctx.rolloverHour,
      isManual: true,
    },
    null,
  );
  const result = await insertSession(database, userId, {
    subjectId: subject.id,
    topicId,
    planEntryId,
    source: "manual",
    mode: null,
    startedAt,
    endedAt,
    pomodorosCompleted: 0,
    autoClosed: false,
    timezone: ctx.timezone,
    rolloverHour: ctx.rolloverHour,
    requestKey,
  });
  await publishSessionEvent(result.event);
  return result;
}

/** SESS-04 (FR-043): correct subject, topic, plan link, start or end; days rewritten. */
export async function editSession(
  database: Database,
  userId: string,
  sessionId: string,
  expectedVersion: number | null,
  input: UpdateSessionInput,
  ctx: SessionContext,
): Promise<{ session: StudySession; event: SessionWrite["event"] }> {
  if (expectedVersion === null) throw new AppError("version_required");
  if (
    input.subjectId === undefined &&
    input.topicId === undefined &&
    input.planEntryId === undefined &&
    input.startedAt === undefined &&
    input.endedAt === undefined
  ) {
    throw fieldsError("body", "at_least_one_field");
  }

  const current = await findSession(database, userId, sessionId);
  if (current === undefined) throw new AppError("not_found");
  if (current.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current } });
  }

  const subjectChanged = input.subjectId !== undefined && input.subjectId !== current.subjectId;
  const subject = await activeSubject(database, userId, input.subjectId ?? current.subjectId);
  const topicId =
    input.topicId !== undefined || subjectChanged
      ? await resolveTopic(
          database,
          userId,
          subject.id,
          input.topicId === undefined ? current.topicId : input.topicId,
        )
      : current.topicId;
  const planEntryId =
    input.planEntryId === undefined ? current.planEntryId : await resolvePlanEntry(database, userId, input.planEntryId);

  const startedAt = input.startedAt === undefined ? new Date(current.startedAt) : validateInstant(input.startedAt, "startedAt");
  const endedAt = input.endedAt === undefined ? new Date(current.endedAt) : validateInstant(input.endedAt, "endedAt");
  const timeChanged = input.startedAt !== undefined || input.endedAt !== undefined;
  if (timeChanged) {
    if (startedAt.getTime() > ctx.now.getTime() || endedAt.getTime() > ctx.now.getTime()) {
      throw new AppError("manual_entry_in_future", { details: { now: ctx.now.toISOString() } });
    }
    if (endedAt.getTime() <= startedAt.getTime()) throw fieldsError("endedAt", "after_start");
    validateDuration(Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
  }

  const timezone = timeChanged ? ctx.timezone : current.timezone;
  const rolloverHour = timeChanged ? ctx.rolloverHour : 0;
  const allocations = timeChanged
    ? await validateWrite(
        database,
        userId,
        { startedAt, endedAt, timezone, rolloverHour, isManual: current.source === "manual" },
        sessionId,
      )
    : null;

  const result = await database.transaction(async (tx) => {
    if (timeChanged && allocations !== null) {
      // FR-043: the days are rewritten from the new range; the old rows disappear.
      await tx.query("DELETE FROM study_session_days WHERE session_id = $1", [sessionId]);
      for (const allocation of allocations) {
        await tx.query(
          `INSERT INTO study_session_days (session_id, local_date, user_id, subject_id, seconds, is_manual, is_ranked)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            sessionId,
            allocation.localDate,
            userId,
            subject.id,
            allocation.seconds,
            current.source === "manual",
            current.source === "timer" && Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) >= 300,
          ],
        );
      }
    } else if (subjectChanged) {
      // A subject change propagates to the day rows (EC-008), so the ranked flag stays
      // in step with the timer-source rule that never depends on the subject.
      await tx.query(
        `UPDATE study_session_days SET subject_id = $3 WHERE session_id = $1 AND user_id = $2`,
        [sessionId, userId, subject.id],
      );
    }

    const updated = await tx.query<{ id: string; user_id: string; subject_id: string }>(
      `UPDATE study_sessions
       SET subject_id = $3, topic_id = $4, plan_entry_id = $5, started_at = $6, ended_at = $7,
           duration_seconds = $8, timezone = $9, local_date = $10, day_rollover_hour = $11,
           version = version + 1, updated_at = now()
       WHERE user_id = $1 AND id = $2 AND version = $12
       RETURNING id, user_id, subject_id`,
      [
        userId,
        sessionId,
        subject.id,
        topicId,
        planEntryId,
        startedAt,
        endedAt,
        timeChanged ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : current.durationSeconds,
        timezone,
        timeChanged ? localDateOf(startedAt, timezone, rolloverHour) : current.localDate,
        rolloverHour,
        expectedVersion,
      ],
    );
    const row = updated[0];
    if (row === undefined) {
      throw new AppError("stale_version", { details: { current: await getSession(database, userId, sessionId) } });
    }
    const rows = await tx.query<SessionRow>(`${SELECT_SESSION} WHERE s.id = $1`, [sessionId]);
    const fresh = rows[0];
    if (fresh === undefined) throw new AppError("internal_error");
    const session = await withAllocations(tx, present(fresh));
    return { session, event: eventOf("SessionEdited", row) };
  });
  await publishSessionEvent(result.event);
  return result;
}

/** SESS-05 (FR-044): hard delete; the day rows cascade. */
export async function deleteSession(
  database: Queryable,
  userId: string,
  sessionId: string,
  expectedVersion: number | null,
): Promise<void> {
  if (expectedVersion === null) throw new AppError("version_required");
  const deleted = await database.query<{ id: string; user_id: string; subject_id: string }>(
    `DELETE FROM study_sessions WHERE user_id = $1 AND id = $2 AND version = $3
     RETURNING id, user_id, subject_id`,
    [userId, sessionId, expectedVersion],
  );
  const row = deleted[0];
  if (row === undefined) {
    const current = await findSession(database, userId, sessionId);
    if (current === undefined) throw new AppError("not_found");
    throw new AppError("stale_version", { details: { current } });
  }
  await publishSessionEvent(eventOf("SessionDeleted", row));
}

const CURSOR_BODY = Buffer.from("sess").toString("base64url");

/** `startedAtMs|id` with a marker byte, base64url (API-CONVENTIONS section 4). */
export function encodeCursor(startedAtMs: number, id: string): string {
  return Buffer.from(`${CURSOR_BODY}|${startedAtMs}|${id}`).toString("base64url");
}

/** A malformed or tampered cursor answers `invalid_cursor`, never an empty page. */
export function decodeCursor(cursor: string): { startedAtMs: number; id: string } {
  let text: string;
  try {
    text = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw new AppError("invalid_cursor");
  }
  const [marker, startedAt, id] = text.split("|");
  if (marker !== CURSOR_BODY || id === undefined || !/^\d+$/.test(startedAt ?? "")) {
    throw new AppError("invalid_cursor");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new AppError("invalid_cursor");
  }
  if (encodeCursor(Number(startedAt), id) !== cursor) throw new AppError("invalid_cursor");
  return { startedAtMs: Number(startedAt), id };
}

/** SESS-01 (FR-061): the caller's sessions, newest first, cursor paginated. */
export async function listSessions(
  database: Queryable,
  userId: string,
  query: SessionListQuery,
  ctx: SessionContext,
): Promise<SessionPage> {
  const limit = query.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError("invalid_page_size", { details: { limit: 50 } });
  }
  if (query.from !== undefined && query.to !== undefined && query.from > query.to) {
    throw new AppError("invalid_date_range");
  }

  const conditions = ["s.user_id = $1"];
  const values: unknown[] = [userId];
  if (query.from !== undefined) {
    conditions.push(`EXISTS (SELECT 1 FROM study_session_days d
      WHERE d.session_id = s.id AND d.local_date >= $${values.length + 1})`);
    values.push(query.from);
  }
  if (query.to !== undefined) {
    conditions.push(`EXISTS (SELECT 1 FROM study_session_days d
      WHERE d.session_id = s.id AND d.local_date <= $${values.length + 1})`);
    values.push(query.to);
  }
  if (query.subjectId !== undefined) {
    conditions.push(`s.subject_id = $${values.length + 1}`);
    values.push(query.subjectId);
  }
  if (query.topicId !== undefined) {
    conditions.push(`s.topic_id = $${values.length + 1}`);
    values.push(query.topicId);
  }
  if (query.source !== undefined) {
    conditions.push(`s.source = $${values.length + 1}`);
    values.push(query.source);
  }
  if (query.cursor !== undefined) {
    const decoded = decodeCursor(query.cursor);
    conditions.push(`(s.started_at, s.id) < ($${values.length + 1}, $${values.length + 2})`);
    values.push(new Date(decoded.startedAtMs), decoded.id);
  }

  const rows = await database.query<SessionRow>(
    `${SELECT_SESSION} WHERE ${conditions.join(" AND ")}
     ORDER BY s.started_at DESC, s.id DESC
     LIMIT $${values.length + 1}`,
    [...values, limit + 1],
  );
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const sessions = pageRows.map((row) => ({ ...present(row), dayAllocations: [] as DayAllocation[] }));
  const allocations = new Map<string, DayAllocation[]>();
  if (sessions.length > 0) {
    const dayRows = await database.query<{ session_id: string; local_date: string; seconds: number; is_manual: boolean }>(
      `SELECT d.session_id, d.local_date::text, d.seconds, d.is_manual
       FROM study_session_days d
       WHERE d.session_id = ANY($1::uuid[])
       ORDER BY d.session_id, d.local_date`,
      [sessions.map((session) => session.id)],
    );
    for (const row of dayRows) {
      const list = allocations.get(row.session_id) ?? [];
      list.push({ localDate: row.local_date, seconds: row.seconds, isManual: row.is_manual });
      allocations.set(row.session_id, list);
    }
  }
  const last = pageRows[pageRows.length - 1];
  return {
    data: sessions.map((session) => ({ ...session, dayAllocations: allocations.get(session.id) ?? [] })),
    nextCursor: hasMore && last !== undefined ? encodeCursor(last.started_at.getTime(), last.id) : null,
    hasMore,
  };
}

/** Registered purge handler (NFR-031); sessions cascade, so their rows go with them. */
export async function purgeSessions(userId: string, database: Queryable): Promise<number> {
  const rows = await database.query<{ id: string }>(
    "DELETE FROM study_sessions WHERE user_id = $1 RETURNING id",
    [userId],
  );
  return rows.length;
}

/** Registered export contributor (FR-130, FR-131). */
export async function exportSessions(userId: string, database: Queryable): Promise<unknown[]> {
  return database.query<Record<string, unknown>>(
    `SELECT s.id, s.subject_id, s.topic_id, s.plan_entry_id, s.source, s.mode, s.started_at,
            s.ended_at, s.duration_seconds, s.pomodoros_completed, s.auto_closed, s.timezone,
            s.local_date::text, s.created_at, s.updated_at
     FROM study_sessions s WHERE s.user_id = $1 ORDER BY s.started_at, s.id`,
    [userId],
  );
}
