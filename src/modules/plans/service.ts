/**
 * Study plans (FR-030..FR-038): planned study blocks with an advisory overlap check
 * (BR-026), a read-only rule once an entry has started (BR-028, FR-035), the missed mark
 * (BR-005, FR-033) and the exam-date warning (FR-038, BR-025).
 *
 * Planned time is `duration_min` (BR-001). Actual time is the sum of the sessions linked
 * to an entry, which the Study sessions module owns: this milestone answers planned values
 * only, and the actual fields arrive with M06 (B-07), so `status` is `upcoming` or
 * `missed` and never `done` yet.
 *
 * `PlanEntry` is the wire shape of API-SCHEMAS section 8.
 */
import { config } from "../../kernel/config";
import { uuidv7 } from "../../kernel/crypto";
import type { Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import { isLocalDate, localDateOf, localDayRange, type LocalDate } from "../../kernel/time";
import * as exams from "../exams/public";
import * as subjects from "../subjects/public";
import * as topics from "../topics/public";
import { publishPlanEvent } from "./events";

export type PlanEntryStatus = "upcoming" | "done" | "missed";

/** The two advisory warnings of BR-026 and FR-038, confirmed by code (API-CONVENTIONS 8). */
export type PlanWarningCode = "overlap" | "exam_date";

export type PlanWarning =
  | {
      code: "overlap";
      planEntryId: string;
      subjectId: string;
      startsAt: string;
      durationMin: number;
    }
  | { code: "exam_date"; examId: string; examDate: LocalDate };

export interface PlanEntry {
  id: string;
  subjectId: string;
  topicId: string | null;
  startsAt: string;
  durationMin: number;
  timezone: string;
  localDate: LocalDate;
  status: PlanEntryStatus;
  missedAt: string | null;
  plannedMin: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** What the module needs to know about the caller's clock and zone (BR-030). */
export interface PlanContext {
  now: Date;
  timezone: string;
  rolloverHour: number;
}

export interface CreatePlanEntryInput {
  subjectId: string;
  topicId?: string | null | undefined;
  startsAt: string;
  durationMin: number;
  confirmedWarnings?: readonly PlanWarningCode[] | undefined;
}

export interface UpdatePlanEntryInput {
  subjectId?: string | undefined;
  topicId?: string | null | undefined;
  startsAt?: string | undefined;
  durationMin?: number | undefined;
  confirmedWarnings?: readonly PlanWarningCode[] | undefined;
}

/** PLAN-01 query: a required range plus two optional filters (FR-037). */
export interface PlanEntryListQuery {
  from: LocalDate;
  to: LocalDate;
  subjectId?: string | undefined;
  status?: PlanEntryStatus | undefined;
}

interface PlanEntryRow {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  starts_at: Date;
  duration_min: number;
  timezone: string;
  local_date: string;
  missed_at: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

const SELECT_PLAN_ENTRY = `
  SELECT p.id, p.user_id, p.subject_id, p.topic_id, p.starts_at, p.duration_min, p.timezone,
         p.local_date::text, p.missed_at, p.version, p.created_at, p.updated_at
  FROM plan_entries p`;

function fieldsError(path: string, rule: string, extra: Record<string, unknown> = {}): AppError {
  return new AppError("validation_failed", { details: { fields: [{ path, rule, ...extra }] } });
}

function present(row: PlanEntryRow): PlanEntry {
  return {
    id: row.id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    startsAt: row.starts_at.toISOString(),
    durationMin: row.duration_min,
    timezone: row.timezone,
    localDate: row.local_date,
    // BR-005: `missed` is stored; `done` needs a linked session, which M06 adds (B-07).
    status: row.missed_at === null ? "upcoming" : "missed",
    missedAt: row.missed_at === null ? null : row.missed_at.toISOString(),
    plannedMin: row.duration_min,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function validateDuration(value: number): number {
  const { minDurationMinutes, maxDurationMinutes } = config.plan;
  if (!Number.isInteger(value) || value < minDurationMinutes || value > maxDurationMinutes) {
    throw new AppError("duration_out_of_range", {
      details: { min: minDurationMinutes, max: maxDurationMinutes },
    });
  }
  return value;
}

function validateInstant(value: string, path: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw fieldsError(path, "instant");
  return parsed;
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

/**
 * BR-026: entries of the caller whose `[start, start + duration)` intersects the
 * candidate. Intervals that only touch do not overlap (AC-FR-034-3), which is why the
 * comparison is strict at both ends.
 */
async function overlappingEntries(
  database: Queryable,
  userId: string,
  startsAt: Date,
  durationMin: number,
  excludeId: string | null,
): Promise<PlanWarning[]> {
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
  const rows = await database.query<{
    id: string;
    subject_id: string;
    starts_at: Date;
    duration_min: number;
  }>(
    `SELECT p.id, p.subject_id, p.starts_at, p.duration_min
     FROM plan_entries p
     WHERE p.user_id = $1
       AND p.starts_at < $3
       AND $2 < p.starts_at + (p.duration_min * interval '1 minute')
       AND ($4::uuid IS NULL OR p.id <> $4::uuid)
     ORDER BY p.starts_at, p.id`,
    [userId, startsAt, endsAt, excludeId],
  );
  return rows.map((row) => ({
    code: "overlap" as const,
    planEntryId: row.id,
    subjectId: row.subject_id,
    startsAt: row.starts_at.toISOString(),
    durationMin: row.duration_min,
  }));
}

/**
 * FR-038: the subject's exams that are still ahead of today (EC-013) and fall before the
 * entry's local date. Exams owns the date, so the lookup travels through its interface.
 */
async function planWarnings(
  database: Queryable,
  userId: string,
  candidate: { subjectId: string; startsAt: Date; durationMin: number; localDate: LocalDate },
  excludeId: string | null,
  today: LocalDate,
): Promise<PlanWarning[]> {
  const overlap = await overlappingEntries(
    database,
    userId,
    candidate.startsAt,
    candidate.durationMin,
    excludeId,
  );
  const upcoming = await exams.upcomingExamsBySubject(database, userId, [candidate.subjectId], today);
  const afterExam = (upcoming.get(candidate.subjectId) ?? [])
    .filter((exam) => exam.examDate < candidate.localDate)
    .map((exam): PlanWarning => ({ code: "exam_date", examId: exam.id, examDate: exam.examDate }));
  return [...overlap, ...afterExam];
}

/**
 * API-CONVENTIONS section 8: a warning absent from `confirmedWarnings` is refused, and
 * when an overlap is among them the overlap code wins while `details.warnings` lists both.
 */
function refuseUnconfirmed(warnings: readonly PlanWarning[], confirmed: readonly PlanWarningCode[]): void {
  const unconfirmed = warnings.filter((warning) => !confirmed.includes(warning.code));
  if (unconfirmed.length === 0) return;
  const code = unconfirmed.some((warning) => warning.code === "overlap")
    ? "overlap_confirmation_required"
    : "exam_date_warning_confirmation_required";
  throw new AppError(code, { details: { warnings: unconfirmed } });
}

/** The advisories the caller accepted, echoed so the client can say what it agreed to. */
function confirmedOnly(warnings: readonly PlanWarning[], confirmed: readonly PlanWarningCode[]): PlanWarning[] {
  return warnings.filter((warning) => confirmed.includes(warning.code));
}

function utcDayNumber(date: LocalDate): number {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day);
}

/** A real calendar date: `2026-02-31` rolls into March in UTC and fails the round trip. */
function isRealDate(date: LocalDate): boolean {
  return isLocalDate(date) && new Date(utcDayNumber(date)).toISOString().slice(0, 10) === date;
}

/**
 * API-CONVENTIONS section 5: an inclusive range of at most 93 local dates of the current
 * profile zone (EC-006), so the filter never reads the frozen `local_date`. Day counting
 * runs in UTC, where a day is always 86 400 000 ms; only the bounds need the zone.
 */
function rangeOf(query: PlanEntryListQuery, ctx: PlanContext): { start: Date; end: Date } {
  const { from, to } = query;
  const maxSpan = config.plan.maxRangeDays;
  if (!isRealDate(from)) {
    throw new AppError("validation_failed", { details: { fields: [{ path: "from", rule: "date" }] } });
  }
  if (!isRealDate(to)) {
    throw new AppError("validation_failed", { details: { fields: [{ path: "to", rule: "date" }] } });
  }
  const span = (utcDayNumber(to) - utcDayNumber(from)) / 86_400_000 + 1;
  if (span < 1 || span > maxSpan) {
    throw new AppError("invalid_date_range", { details: { maxSpan: `${maxSpan} days` } });
  }
  return {
    start: localDayRange(from, ctx.timezone, ctx.rolloverHour).start,
    end: localDayRange(to, ctx.timezone, ctx.rolloverHour).end,
  };
}

/**
 * PLAN-01 (FR-037). Entries of archived subjects are hidden (EC-007), so the active
 * subject list decides what is visible. `status` is derived and then filtered: `done`
 * needs a linked session, which M06 adds (B-07).
 */
export async function listPlanEntries(
  database: Queryable,
  userId: string,
  query: PlanEntryListQuery,
  ctx: PlanContext,
): Promise<PlanEntry[]> {
  const { start, end } = rangeOf(query, ctx);
  const active = await subjects.listSubjects(database, userId);
  if (active.length === 0) return [];

  const rows = await database.query<PlanEntryRow>(
    `${SELECT_PLAN_ENTRY}
     WHERE p.user_id = $1 AND p.starts_at >= $2 AND p.starts_at < $3
       AND p.subject_id = ANY($4::uuid[])
       AND ($5::uuid IS NULL OR p.subject_id = $5::uuid)
     ORDER BY p.starts_at, p.id`,
    [userId, start, end, active.map((subject) => subject.id), query.subjectId ?? null],
  );
  const entries = rows.map(present);
  return query.status === undefined
    ? entries
    : entries.filter((entry) => entry.status === query.status);
}

async function findPlanEntry(
  database: Queryable,
  userId: string,
  entryId: string,
): Promise<PlanEntry | undefined> {
  const rows = await database.query<PlanEntryRow>(
    `${SELECT_PLAN_ENTRY} WHERE p.id = $1 AND p.user_id = $2`,
    [entryId, userId],
  );
  const row = rows[0];
  return row === undefined ? undefined : present(row);
}

/** PLAN-03. */
export async function getPlanEntry(
  database: Queryable,
  userId: string,
  entryId: string,
): Promise<PlanEntry> {
  const entry = await findPlanEntry(database, userId, entryId);
  if (entry === undefined) throw new AppError("not_found");
  return entry;
}

/** PLAN-02 (FR-030). An entry must start in the future with an active subject. */
export async function createPlanEntry(
  database: Queryable,
  userId: string,
  input: CreatePlanEntryInput,
  ctx: PlanContext,
): Promise<{ entry: PlanEntry; warnings: PlanWarning[] }> {
  const subject = await subjects.getSubject(database, userId, input.subjectId);
  if (subject.archivedAt !== null) {
    throw new AppError("subject_archived", { details: { subjectId: subject.id } });
  }

  const startsAt = validateInstant(input.startsAt, "startsAt");
  if (startsAt.getTime() <= ctx.now.getTime()) throw fieldsError("startsAt", "future");
  const durationMin = validateDuration(input.durationMin);
  const topicId = await resolveTopic(database, userId, subject.id, input.topicId ?? null);

  const localDate = localDateOf(startsAt, ctx.timezone, ctx.rolloverHour);
  const today = localDateOf(ctx.now, ctx.timezone, ctx.rolloverHour);
  const warnings = await planWarnings(
    database,
    userId,
    { subjectId: subject.id, startsAt, durationMin, localDate },
    null,
    today,
  );
  const confirmed = input.confirmedWarnings ?? [];
  refuseUnconfirmed(warnings, confirmed);

  const id = uuidv7();
  await database.query(
    `INSERT INTO plan_entries
       (id, user_id, subject_id, topic_id, starts_at, duration_min, timezone, local_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, userId, subject.id, topicId, startsAt, durationMin, ctx.timezone, localDate],
  );
  return { entry: await getPlanEntry(database, userId, id), warnings: confirmedOnly(warnings, confirmed) };
}

/**
 * PLAN-04 (FR-031). The version check runs first, so a stale editor answers with the
 * current entry, then the read-only rule (BR-028, FR-035), then field validation.
 * `timezone` and `local_date` are re-frozen only when the start itself changes (EC-006).
 */
export async function editPlanEntry(
  database: Queryable,
  userId: string,
  entryId: string,
  expectedVersion: number | null,
  input: UpdatePlanEntryInput,
  ctx: PlanContext,
): Promise<{ entry: PlanEntry; warnings: PlanWarning[] }> {
  if (expectedVersion === null) throw new AppError("version_required");
  if (
    input.subjectId === undefined &&
    input.topicId === undefined &&
    input.startsAt === undefined &&
    input.durationMin === undefined
  ) {
    throw fieldsError("body", "at_least_one_field");
  }

  const current = await findPlanEntry(database, userId, entryId);
  if (current === undefined) throw new AppError("not_found");
  if (current.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current } });
  }
  if (Date.parse(current.startsAt) <= ctx.now.getTime()) {
    throw new AppError("past_entry_read_only", { details: { startsAt: current.startsAt } });
  }

  const subjectChanged = input.subjectId !== undefined && input.subjectId !== current.subjectId;
  const subject = await subjects.getSubject(database, userId, input.subjectId ?? current.subjectId);
  if (subjectChanged && subject.archivedAt !== null) {
    throw new AppError("subject_archived", { details: { subjectId: subject.id } });
  }

  const startsAt =
    input.startsAt === undefined ? new Date(current.startsAt) : validateInstant(input.startsAt, "startsAt");
  if (input.startsAt !== undefined && startsAt.getTime() <= ctx.now.getTime()) {
    throw fieldsError("startsAt", "future");
  }
  const durationMin = input.durationMin === undefined ? current.durationMin : validateDuration(input.durationMin);
  // A new subject needs a topic of its own: the client sends `topicId: null` to drop one.
  const topicId =
    input.topicId !== undefined || subjectChanged
      ? await resolveTopic(
          database,
          userId,
          subject.id,
          input.topicId === undefined ? current.topicId : input.topicId,
        )
      : current.topicId;

  const timezone = input.startsAt === undefined ? current.timezone : ctx.timezone;
  const localDate =
    input.startsAt === undefined
      ? current.localDate
      : localDateOf(startsAt, ctx.timezone, ctx.rolloverHour);
  const today = localDateOf(ctx.now, ctx.timezone, ctx.rolloverHour);
  const warnings = await planWarnings(
    database,
    userId,
    { subjectId: subject.id, startsAt, durationMin, localDate },
    entryId,
    today,
  );
  const confirmed = input.confirmedWarnings ?? [];
  refuseUnconfirmed(warnings, confirmed);

  const updated = await database.query<{ id: string }>(
    `UPDATE plan_entries
     SET subject_id = $3, topic_id = $4, starts_at = $5, duration_min = $6, timezone = $7,
         local_date = $8, version = version + 1, updated_at = now()
     WHERE user_id = $1 AND id = $2 AND version = $9
     RETURNING id`,
    [userId, entryId, subject.id, topicId, startsAt, durationMin, timezone, localDate, expectedVersion],
  );
  if (updated.length === 0) {
    throw new AppError("stale_version", { details: { current: await getPlanEntry(database, userId, entryId) } });
  }
  return { entry: await getPlanEntry(database, userId, entryId), warnings: confirmedOnly(warnings, confirmed) };
}

/**
 * PLAN-05. Allowed for a past entry too (FR-032 sets no start condition). The event is
 * published after the delete commits, so a subscriber never sees a row that still exists.
 */
export async function deletePlanEntry(
  database: Queryable,
  userId: string,
  entryId: string,
  expectedVersion: number | null,
): Promise<void> {
  if (expectedVersion === null) throw new AppError("version_required");
  const deleted = await database.query<{ id: string; subject_id: string }>(
    `DELETE FROM plan_entries WHERE user_id = $1 AND id = $2 AND version = $3
     RETURNING id, subject_id`,
    [userId, entryId, expectedVersion],
  );
  const row = deleted[0];
  if (row === undefined) {
    const current = await findPlanEntry(database, userId, entryId);
    if (current === undefined) throw new AppError("not_found");
    throw new AppError("stale_version", { details: { current } });
  }
  await publishPlanEvent({
    type: "PlanEntryDeleted",
    planEntryId: row.id,
    subjectId: row.subject_id,
    userId,
    occurredAt: new Date().toISOString(),
  });
}

/**
 * PLAN-06 (FR-033). Only an entry whose start has passed can be missed, and marking a
 * missed entry again is a no-op that answers the current state.
 */
export async function markPlanEntryMissed(
  database: Queryable,
  userId: string,
  entryId: string,
  expectedVersion: number | null,
  ctx: PlanContext,
): Promise<PlanEntry> {
  if (expectedVersion === null) throw new AppError("version_required");
  const current = await findPlanEntry(database, userId, entryId);
  if (current === undefined) throw new AppError("not_found");
  if (current.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current } });
  }
  if (Date.parse(current.startsAt) >= ctx.now.getTime()) throw fieldsError("body", "not_started_yet");
  if (current.missedAt !== null) return current;

  const updated = await database.query<{ id: string }>(
    `UPDATE plan_entries
     SET missed_at = $4, version = version + 1, updated_at = now()
     WHERE user_id = $1 AND id = $2 AND version = $3
     RETURNING id`,
    [userId, entryId, expectedVersion, ctx.now],
  );
  if (updated.length === 0) {
    throw new AppError("stale_version", { details: { current: await getPlanEntry(database, userId, entryId) } });
  }
  return getPlanEntry(database, userId, entryId);
}

/** Registered purge handler (NFR-031); plan entries go before their subjects (NO ACTION). */
export async function purgePlans(userId: string, database: Queryable): Promise<number> {
  const rows = await database.query<{ id: string }>(
    "DELETE FROM plan_entries WHERE user_id = $1 RETURNING id",
    [userId],
  );
  return rows.length;
}

/** Registered export contributor (FR-130, FR-131). */
export async function exportPlans(userId: string, database: Queryable): Promise<unknown[]> {
  return database.query<Record<string, unknown>>(
    `SELECT id, subject_id, topic_id, starts_at, duration_min, timezone, local_date,
            missed_at, created_at, updated_at
     FROM plan_entries WHERE user_id = $1 ORDER BY starts_at, id`,
    [userId],
  );
}
