/**
 * Exams (FR-120..FR-125): one exam per subject (BR-023) with a fixed local date and a
 * topic checklist (FR-122). Archived state is derived: an exam is archived when its
 * `exam_date` is before today in the profile timezone (BR-025, BR-030), so no column
 * stores it and no endpoint changes it.
 *
 * `Exam` is the wire shape of API-SCHEMAS section 7.
 */
import { config } from "../../kernel/config";
import { uuidv7 } from "../../kernel/crypto";
import type { Database, Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import type { LocalDate } from "../../kernel/time";
import * as subjects from "../subjects/public";
import * as topics from "../topics/public";

export interface ExamChecklistItem {
  topicId: string;
  name: string;
  completed: boolean;
  /** 1..5; Phase 2 readiness (FR-127), always 1 in M04. */
  weight: number;
}

export interface ExamCountdown {
  /** Whole calendar days from today in the profile zone; 0 on exam day. */
  daysRemaining: number;
  isToday: boolean;
}

export type ExamState = "upcoming" | "archived";

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  examDate: LocalDate;
  state: ExamState;
  countdown: ExamCountdown | null;
  checklist: ExamChecklistItem[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** EXAM-01 list item: the detail fields minus the checklist, plus the two counts. */
export interface ExamListItem {
  id: string;
  subjectId: string;
  title: string;
  examDate: LocalDate;
  state: ExamState;
  countdown: ExamCountdown | null;
  topicCount: number;
  completedCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamPatch {
  subjectId?: string;
  title?: string;
  examDate?: LocalDate;
}

interface ExamRow {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  exam_date: string;
  version: number;
  created_at: Date;
  updated_at: Date;
}

interface ListCountRow {
  exam_id: string;
  topic_count: number;
  completed_count: number;
}

const SELECT_EXAM = `
  SELECT e.id, e.user_id, e.subject_id, e.title, e.exam_date::text, e.version,
         e.created_at, e.updated_at
  FROM exams e`;

function fieldsError(path: string, rule: string, extra: Record<string, unknown> = {}): AppError {
  return new AppError("validation_failed", { details: { fields: [{ path, rule, ...extra }] } });
}

function validateTitle(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > config.exams.titleMaxLength) {
    throw fieldsError("title", "length", { min: 1, max: config.exams.titleMaxLength });
  }
  return trimmed;
}

function validateDate(value: string): LocalDate {
  const raw = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw fieldsError("examDate", "date");
  const [year, month, day] = raw.split("-").map(Number) as [number, number, number];
  if (month < 1 || month > 12 || day < 1 || day > 31) throw fieldsError("examDate", "date");
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw fieldsError("examDate", "date");
  }
  return raw;
}

function present(row: ExamRow, checklist: ExamChecklistItem[], today: LocalDate): Exam {
  const date = row.exam_date.toISOString().slice(0, 10);
  const state: ExamState = date < today ? "archived" : "upcoming";
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    examDate: date,
    state,
    countdown: state === "archived" ? null : countdownOf(date, today),
    checklist,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function presentListItem(row: ExamRow, counts: ListCountRow | undefined, today: LocalDate): ExamListItem {
  const date = row.exam_date.toISOString().slice(0, 10);
  const state: ExamState = date < today ? "archived" : "upcoming";
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    examDate: date,
    state,
    countdown: state === "archived" ? null : countdownOf(date, today),
    topicCount: counts?.topic_count ?? 0,
    completedCount: counts?.completed_count ?? 0,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Whole calendar days between two local dates; negative never returned (BR-025). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  const [fy, fm, fd] = from.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = to.split("-").map(Number) as [number, number, number];
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  return Math.round((end - start) / 86_400_000);
}

export function countdownOf(date: LocalDate, today: LocalDate): ExamCountdown {
  return { daysRemaining: daysBetween(today, date), isToday: date === today };
}

/** All active topics of a subject as name and id; archived topics never enter. */
async function subjectTopics(
  database: Queryable,
  userId: string,
  subjectId: string,
): Promise<{ id: string; name: string }[]> {
  const rows = await database.query<{ id: string; name: string }>(
    `SELECT t.id, t.name FROM topics t
     WHERE t.subject_id = $1 AND t.user_id = $2 AND t.archived_at IS NULL
     ORDER BY t.position, t.id`,
    [subjectId, userId],
  );
  return rows;
}

async function getExamRow(database: Queryable, userId: string, examId: string): Promise<ExamRow> {
  const rows = await database.query<ExamRow>(`${SELECT_EXAM} WHERE e.id = $1 AND e.user_id = $2`, [
    examId,
    userId,
  ]);
  const row = rows[0];
  if (row === undefined) throw new AppError("not_found");
  return row;
}

/** EXAM-03. Archived topics leave the checklist (EC-008); the removal is noted for Phase 2. */
export async function getExam(
  database: Queryable,
  userId: string,
  examId: string,
  today: LocalDate,
): Promise<Exam> {
  const row = await getExamRow(database, userId, examId);
  const items = await database.query<{
    topic_id: string;
    name: string;
    completed: boolean;
    weight: number;
  }>(
    `SELECT x.topic_id, t.name, x.completed, x.weight
     FROM exam_topics x JOIN topics t ON t.id = x.topic_id AND t.subject_id = x.subject_id
     WHERE x.exam_id = $1 AND t.archived_at IS NULL
     ORDER BY t.position, t.id`,
    [row.id],
  );
  return present(
    row,
    items.map((item) => ({
      topicId: item.topic_id,
      name: item.name,
      completed: item.completed,
      weight: item.weight,
    })),
    today,
  );
}

/** EXAM-01. Upcoming is unpaginated, nearest first; archived is cursor-paginated, newest first. */
export async function listExams(
  database: Queryable,
  userId: string,
  state: ExamState,
  page: { limit?: number; cursor?: string } | null,
  today: LocalDate,
): Promise<{ data: ExamListItem[]; nextCursor: string | null; hasMore: boolean }> {
  if (state === "upcoming") {
    const rows = await database.query<ExamRow>(
      `${SELECT_EXAM} WHERE e.user_id = $1 AND e.exam_date >= $2
       ORDER BY e.exam_date, e.id`,
      [userId, today],
    );
    const counts = await countByExam(database, userId);
    return {
      data: rows.map((row) => presentListItem(row, counts.get(row.id), today)),
      nextCursor: null,
      hasMore: false,
    };
  }

  const limit = page?.limit ?? config.exams.archivePageSize;
  if (!Number.isInteger(limit) || limit < 1 || limit > config.exams.archiveMaxPageSize) {
    throw new AppError("invalid_page_size", { details: { limit: config.exams.archivePageSize } });
  }
  let cursorDate: string | null = null;
  let cursorId: string | null = null;
  if (page?.cursor !== undefined) {
    const decoded = decodeCursor(page.cursor);
    cursorDate = decoded.date;
    cursorId = decoded.id;
  }

  const conditions = ["e.user_id = $1", "e.exam_date < $2"];
  const values: unknown[] = [userId, today];
  if (cursorDate !== null && cursorId !== null) {
    conditions.push("(e.exam_date, e.id) < ($3, $4)");
    values.push(cursorDate, cursorId);
  }
  const rows = await database.query<ExamRow>(
    `${SELECT_EXAM} WHERE ${conditions.join(" AND ")}
     ORDER BY e.exam_date DESC, e.id DESC
     LIMIT $${values.length + 1}`,
    [...values, limit + 1],
  );

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const counts = await countByExam(database, userId);
  const last = pageRows[pageRows.length - 1];
  return {
    data: pageRows.map((row) => presentListItem(row, counts.get(row.id), today)),
    nextCursor: hasMore && last !== undefined ? encodeCursor(last.exam_date.toISOString().slice(0, 10), last.id) : null,
    hasMore,
  };
}

async function countByExam(database: Queryable, userId: string): Promise<Map<string, ListCountRow>> {
  const rows = await database.query<ListCountRow>(
    `SELECT x.exam_id, count(x.topic_id) AS topic_count,
            count(*) FILTER (WHERE x.completed) AS completed_count
     FROM exam_topics x
     JOIN exams e ON e.id = x.exam_id AND e.user_id = $1
     JOIN topics t ON t.id = x.topic_id AND t.subject_id = x.subject_id
     WHERE t.archived_at IS NULL
     GROUP BY x.exam_id`,
    [userId],
  );
  return new Map(rows.map((row) => [row.exam_id, row]));
}

/** EXAM-02. The date is checked against the user's local today (BR-030, EC-013). */
export async function createExam(
  database: Queryable,
  userId: string,
  input: { subjectId: string; title: string; examDate: string },
  today: LocalDate,
): Promise<Exam> {
  const subject = await subjects.getSubject(database, userId, input.subjectId);
  if (subject.archivedAt !== null) throw new AppError("subject_archived", { details: { subjectId: input.subjectId } });
  const title = validateTitle(input.title);
  const date = validateDate(input.examDate);
  if (date < today) throw new AppError("exam_date_in_past", { details: { examDate: date } });

  const id = uuidv7();
  await database.query(
    `INSERT INTO exams (id, user_id, subject_id, title, exam_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [id, userId, subject.id, title, date, new Date()],
  );
  return getExam(database, userId, id, today);
}

/**
 * EXAM-04. A past date is allowed on edit (EC-013); changing the subject clears the
 * checklist in the same transaction (AC-FR-121-4). An archived exam accepts only a
 * body with `examDate` alone (FR-125 AC-3); a today-or-later date restores it.
 */
export async function editExam(
  database: Database,
  userId: string,
  examId: string,
  expectedVersion: number | null,
  patch: ExamPatch,
  today: LocalDate,
): Promise<Exam> {
  if (expectedVersion === null) throw new AppError("version_required");
  if (patch.subjectId === undefined && patch.title === undefined && patch.examDate === undefined) {
    throw fieldsError("body", "at_least_one_field");
  }

  const current = await getExamRow(database, userId, examId);
  if (current.version !== expectedVersion) {
    const fresh = await getExam(database, userId, examId, today);
    throw new AppError("stale_version", { details: { current: fresh } });
  }

  const currentDate = current.exam_date.toISOString().slice(0, 10);
  const archived = currentDate < today;
  if (archived && (patch.subjectId !== undefined || patch.title !== undefined)) {
    throw fieldsError("body", "exam_archived", { allowed: ["examDate"] });
  }

  const assignments: string[] = [];
  const values: unknown[] = [userId, examId, expectedVersion];
  let nextDate = currentDate;

  if (patch.title !== undefined) {
    values.push(validateTitle(patch.title));
    assignments.push(`title = $${values.length}`);
  }
  if (patch.subjectId !== undefined) {
    const subject = await subjects.getSubject(database, userId, patch.subjectId);
    if (subject.archivedAt !== null) {
      throw new AppError("subject_archived", { details: { subjectId: patch.subjectId } });
    }
    values.push(subject.id);
    assignments.push(`subject_id = $${values.length}`);
  }
  if (patch.examDate !== undefined) {
    nextDate = validateDate(patch.examDate);
    values.push(nextDate);
    assignments.push(`exam_date = $${values.length}`);
  }

  await database.transaction(async (tx) => {
    const rows = await tx.query<{ id: string }>(
      `UPDATE exams SET ${assignments.join(", ")}, version = version + 1, updated_at = now()
       WHERE user_id = $1 AND id = $2 AND version = $3
       RETURNING id`,
      values,
    );
    if (rows.length === 0) {
      const fresh = await getExam(database, userId, examId, today);
      throw new AppError("stale_version", { details: { current: fresh } });
    }
    if (patch.subjectId !== undefined) {
      await tx.query("DELETE FROM exam_topics WHERE exam_id = $1", [examId]);
    }
  });

  return getExam(database, userId, examId, today);
}

/** EXAM-05. Replaces membership; retained topics keep `completed`. Empty is valid (EC-014). */
export async function setExamTopics(
  database: Database,
  userId: string,
  examId: string,
  topicIds: readonly string[],
  today: LocalDate,
): Promise<Exam> {
  const row = await getExamRow(database, userId, examId);
  const currentDate = row.exam_date.toISOString().slice(0, 10);
  if (currentDate < today) throw fieldsError("body", "exam_archived");

  const seen = new Set<string>();
  for (const id of topicIds) {
    if (seen.has(id)) throw fieldsError("topicIds", "unique");
    seen.add(id);
  }

  const owned = new Set((await subjectTopics(database, userId, row.subject_id)).map((topic) => topic.id));
  const offending = [...seen].filter((id) => !owned.has(id));
  if (offending.length > 0) {
    throw fieldsError("topicIds", "member_of_subject", { offending });
  }

  await database.transaction(async (tx) => {
    const existing = await tx.query<{ topic_id: string; completed: boolean }>(
      "SELECT topic_id, completed FROM exam_topics WHERE exam_id = $1",
      [row.id],
    );
    const completedOf = new Map(existing.map((item) => [item.topic_id, item.completed]));
    await tx.query("DELETE FROM exam_topics WHERE exam_id = $1", [row.id]);
    for (const topicId of topicIds) {
      await tx.query(
        `INSERT INTO exam_topics (exam_id, topic_id, subject_id, completed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, now(), now())`,
        [row.id, topicId, row.subject_id, completedOf.get(topicId) ?? false],
      );
    }
  });

  return getExam(database, userId, examId, today);
}

/** EXAM-06. Idempotent set on an unversioned row; archived exams are read-only. */
export async function setExamTopic(
  database: Queryable,
  userId: string,
  examId: string,
  topicId: string,
  completed: boolean,
  today: LocalDate,
): Promise<Exam> {
  const row = await getExamRow(database, userId, examId);
  const currentDate = row.exam_date.toISOString().slice(0, 10);
  if (currentDate < today) throw fieldsError("body", "exam_archived");

  await database.query(
    `UPDATE exam_topics SET completed = $3, updated_at = now()
     WHERE exam_id = $1 AND topic_id = $2`,
    [examId, topicId, completed],
  );
  return getExam(database, userId, examId, today);
}

/** Registered purge handler (NFR-031): the checklist cascades with the exam. */
export async function purgeExams(userId: string, database: Queryable): Promise<number> {
  const rows = await database.query<{ id: string }>(
    "DELETE FROM exams WHERE user_id = $1 RETURNING id",
    [userId],
  );
  return rows.length;
}

/** Registered export contributor (FR-130, FR-131); the checklist is not a separate file. */
export async function exportExams(userId: string, database: Queryable): Promise<unknown[]> {
  const rows = await database.query<Record<string, unknown>>(
    `SELECT e.id, e.subject_id, e.title, e.exam_date, e.version, e.created_at, e.updated_at
     FROM exams e WHERE e.user_id = $1 ORDER BY e.exam_date, e.id`,
    [userId],
  );
  return rows;
}


const CURSOR_BODY = Buffer.from("exam").toString("base64url");

/** `examDate|id` with a marker byte, base64url (API-CONVENTIONS section 4). */
export function encodeCursor(date: LocalDate, id: string): string {
  return Buffer.from(`${CURSOR_BODY}|${date}|${id}`).toString("base64url");
}

/** A malformed or tampered cursor answers `invalid_cursor`, never an empty page. */
export function decodeCursor(cursor: string): { date: LocalDate; id: string } {
  let text: string;
  try {
    text = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw new AppError("invalid_cursor");
  }
  const [marker, date, id] = text.split("|");
  if (marker !== CURSOR_BODY || date === undefined || id === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError("invalid_cursor");
  }
  if (!uuidLike(id)) throw new AppError("invalid_cursor");
  // base64url decoding drops trailing garbage, so a tampered tail must not pass: the
  // decoded body has to re-encode to exactly the cursor the caller sent.
  if (encodeCursor(date, id) !== cursor) throw new AppError("invalid_cursor");
  return { date, id };
}

function uuidLike(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}


