/**
 * Topics (FR-015..FR-019): one row per topic inside a subject, versioned for optimistic
 * concurrency (ADR-011). Status is manual and never changes from logged time (FR-019);
 * archived topics keep their weight and status so a restore returns them (AC-FR-018-3).
 *
 * `Topic` is the wire shape of API-SCHEMAS section 6.
 */
import { config } from "../../kernel/config";
import { uuidv7 } from "../../kernel/crypto";
import type { Database, Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import * as subjects from "../subjects/public";
import type { TopicStatus } from "./events";

export type { TopicStatus };

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  weight: number;
  status: TopicStatus;
  position: number;
  archivedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicPatch {
  name?: string;
  weight?: number;
  status?: TopicStatus;
}

export interface BulkTopicsInput {
  lines: readonly string[];
  dryRun: boolean;
}

export interface BulkTopicsPreview {
  valid: string[];
  duplicates: string[];
  tooLong: string[];
}

export const topicStatuses: readonly TopicStatus[] = ["not_started", "in_progress", "done"];

interface TopicRow {
  id: string;
  subject_id: string;
  name: string;
  weight: number;
  status: TopicStatus;
  position: number;
  archived_at: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

const SELECT_TOPIC = `
  SELECT t.id, t.subject_id, t.name, t.weight, t.status, t.position, t.archived_at,
         t.version, t.created_at, t.updated_at
  FROM topics t`;

function present(row: TopicRow): Topic {
  return {
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
    weight: row.weight,
    status: row.status,
    position: row.position,
    archivedAt: row.archived_at?.toISOString() ?? null,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function fieldsError(path: string, rule: string, extra: Record<string, unknown> = {}): AppError {
  return new AppError("validation_failed", { details: { fields: [{ path, rule, ...extra }] } });
}

function validateName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > config.topics.nameMaxLength) {
    throw fieldsError("name", "length", { min: 1, max: config.topics.nameMaxLength });
  }
  return trimmed;
}

function validateWeight(value: number): number {
  if (!Number.isInteger(value) || value < config.topics.weightMin || value > config.topics.weightMax) {
    throw fieldsError("weight", "range", { min: config.topics.weightMin, max: config.topics.weightMax });
  }
  return value;
}

function validateStatus(value: string): TopicStatus {
  if (!(topicStatuses as readonly string[]).includes(value)) throw fieldsError("status", "enum");
  return value as TopicStatus;
}

/**
 * Every topic endpoint starts here: a subject of another user is absent, not forbidden
 * (NFR-016), and a malformed id reaches this as a subject that does not exist.
 */
async function requireSubject(
  database: Queryable,
  userId: string,
  subjectId: string,
): Promise<subjects.Subject> {
  return subjects.getSubject(database, userId, subjectId);
}

async function requireActiveSubject(
  database: Queryable,
  userId: string,
  subjectId: string,
): Promise<subjects.Subject> {
  const subject = await requireSubject(database, userId, subjectId);
  if (subject.archivedAt !== null) {
    throw new AppError("subject_archived", { details: { subjectId } });
  }
  return subject;
}

/** TOP-01. Active first, then archived, both by `position` then `id`. */
export async function listTopics(
  database: Queryable,
  userId: string,
  subjectId: string,
  includeArchived: boolean,
): Promise<Topic[]> {
  await requireSubject(database, userId, subjectId);
  const rows = await database.query<TopicRow>(
    `${SELECT_TOPIC}
     WHERE t.subject_id = $1 AND t.user_id = $2 AND ($3 OR t.archived_at IS NULL)
     ORDER BY (t.archived_at IS NOT NULL), t.position, t.id`,
    [subjectId, userId, includeArchived],
  );
  return rows.map(present);
}

/** TOP-04. Archived topics stay readable so history can show the topic as archived. */
export async function getTopic(
  database: Queryable,
  userId: string,
  topicId: string,
): Promise<Topic> {
  const rows = await database.query<TopicRow>(
    `${SELECT_TOPIC} WHERE t.id = $1 AND t.user_id = $2`,
    [topicId, userId],
  );
  const row = rows[0];
  if (row === undefined) throw new AppError("not_found");
  return present(row);
}

/** TOP-02. Position is the last active slot of the subject; weight and status default in. */
export async function createTopic(
  database: Queryable,
  userId: string,
  subjectId: string,
  input: { name: string; weight?: number | undefined; status?: string | undefined },
  now: Date,
): Promise<Topic> {
  const subject = await requireActiveSubject(database, userId, subjectId);
  const name = validateName(input.name);
  const weight = validateWeight(input.weight ?? 1);
  const status = validateStatus(input.status ?? "not_started");
  const id = uuidv7();

  await database.query(
    `INSERT INTO topics (id, user_id, subject_id, name, weight, status, position, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6,
             (SELECT COALESCE(MAX(position) + 1, 0) FROM topics
               WHERE subject_id = $3 AND archived_at IS NULL),
             $7, $7)`,
    [id, userId, subject.id, name, weight, status, now],
  );

  return getTopic(database, userId, id);
}

/**
 * TOP-05. Returns the status transition alongside the topic so the caller can publish
 * `TopicStatusChanged` after the write commits (FR-122 readiness).
 */
export async function editTopic(
  database: Queryable,
  userId: string,
  topicId: string,
  expectedVersion: number | null,
  patch: TopicPatch,
  now: Date,
): Promise<{ topic: Topic; statusChange: { previousStatus: TopicStatus; status: TopicStatus } | null }> {
  if (expectedVersion === null) throw new AppError("version_required");
  if (patch.name === undefined && patch.weight === undefined && patch.status === undefined) {
    throw fieldsError("body", "at_least_one_field");
  }

  const current = await getTopic(database, userId, topicId);
  if (current.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current } });
  }

  const assignments: string[] = [];
  const values: unknown[] = [userId, topicId, expectedVersion, now];

  if (patch.name !== undefined) {
    values.push(validateName(patch.name));
    assignments.push(`name = $${values.length}`);
  }
  if (patch.weight !== undefined) {
    values.push(validateWeight(patch.weight));
    assignments.push(`weight = $${values.length}`);
  }
  if (patch.status !== undefined) {
    values.push(validateStatus(patch.status));
    assignments.push(`status = $${values.length}`);
  }

  const rows = await database.query<{ id: string }>(
    `UPDATE topics
     SET ${assignments.join(", ")}, version = version + 1, updated_at = $4
     WHERE user_id = $1 AND id = $2 AND version = $3
     RETURNING id`,
    values,
  );
  if (rows.length === 0) {
    const fresh = await getTopic(database, userId, topicId);
    throw new AppError("stale_version", { details: { current: fresh } });
  }

  const topic = await getTopic(database, userId, topicId);
  const statusChange =
    patch.status !== undefined && patch.status !== current.status
      ? { previousStatus: current.status, status: topic.status }
      : null;
  return { topic, statusChange };
}

/** TOP-06. Full active set of the subject, each once; the rewrite is atomic. */
export async function reorderTopics(
  database: Database,
  userId: string,
  subjectId: string,
  topicIds: readonly string[],
  now: Date,
): Promise<Topic[]> {
  await requireSubject(database, userId, subjectId);

  const active = await database.query<{ id: string }>(
    "SELECT id FROM topics WHERE user_id = $1 AND subject_id = $2 AND archived_at IS NULL",
    [userId, subjectId],
  );
  const activeIds = new Set(active.map((row) => row.id));
  const seen = new Set<string>();
  for (const id of topicIds) {
    if (!activeIds.has(id) || seen.has(id)) throw fieldsError("topicIds", "full_set");
    seen.add(id);
  }
  if (seen.size !== activeIds.size) throw fieldsError("topicIds", "full_set");

  await database.transaction(async (tx) => {
    for (const [position, id] of topicIds.entries()) {
      await tx.query(
        `UPDATE topics SET position = $3, version = version + 1, updated_at = $4
         WHERE user_id = $1 AND id = $2`,
        [userId, id, position, now],
      );
    }
  });

  const rows = await database.query<TopicRow>(
    `${SELECT_TOPIC} WHERE t.subject_id = $1 AND t.user_id = $2 AND t.archived_at IS NULL
     ORDER BY t.position, t.id`,
    [subjectId, userId],
  );
  return rows.map(present);
}

/** TOP-07. `changed` is false for an already archived topic, which answers 200 and no event. */
export async function archiveTopic(
  database: Queryable,
  userId: string,
  topicId: string,
  expectedVersion: number | null,
  now: Date,
): Promise<{ topic: Topic; changed: boolean }> {
  if (expectedVersion === null) throw new AppError("version_required");

  const current = await getTopic(database, userId, topicId);
  if (current.archivedAt !== null && current.version === expectedVersion) {
    return { topic: current, changed: false };
  }
  if (current.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current } });
  }

  const rows = await database.query<{ id: string }>(
    `UPDATE topics SET archived_at = $4, version = version + 1, updated_at = $4
     WHERE user_id = $1 AND id = $2 AND version = $3
     RETURNING id`,
    [userId, topicId, expectedVersion, now],
  );
  if (rows.length === 0) {
    const fresh = await getTopic(database, userId, topicId);
    throw new AppError("stale_version", { details: { current: fresh } });
  }

  return { topic: await getTopic(database, userId, topicId), changed: true };
}

/** TOP-08. Prior weight and status are kept; the topic lands last among the active ones. */
export async function restoreTopic(
  database: Queryable,
  userId: string,
  topicId: string,
  expectedVersion: number | null,
  now: Date,
): Promise<{ topic: Topic; changed: boolean }> {
  if (expectedVersion === null) throw new AppError("version_required");

  const current = await getTopic(database, userId, topicId);
  if (current.archivedAt === null && current.version === expectedVersion) {
    return { topic: current, changed: false };
  }
  if (current.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current } });
  }

  const rows = await database.query<{ id: string }>(
    `UPDATE topics
     SET archived_at = NULL,
         position = (SELECT COALESCE(MAX(position) + 1, 0) FROM topics
                      WHERE subject_id = $5 AND archived_at IS NULL),
         version = version + 1, updated_at = $4
     WHERE user_id = $1 AND id = $2 AND version = $3
     RETURNING id`,
    [userId, topicId, expectedVersion, now, current.subjectId],
  );
  if (rows.length === 0) {
    const fresh = await getTopic(database, userId, topicId);
    throw new AppError("stale_version", { details: { current: fresh } });
  }

  return { topic: await getTopic(database, userId, topicId), changed: true };
}

/**
 * FR-017 line rules, shared by the preview and the save: blank lines are dropped, each
 * line is trimmed, and a line longer than the topic name limit is reported. The 200 line
 * cap counts non-blank lines and is checked by the caller that owns the request shape.
 */
export function normaliseBulkLines(lines: readonly string[]): { lines: string[]; tooLong: string[] } {
  const kept: string[] = [];
  const tooLong: string[] = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    kept.push(trimmed);
    if (trimmed.length > config.topics.nameMaxLength && !tooLong.includes(trimmed)) {
      tooLong.push(trimmed);
    }
  }
  return { lines: kept, tooLong };
}

/** More than the cap is rejected before anything else, with the limit and the count. */
export function assertBulkSize(lines: readonly string[]): void {
  if (lines.length > config.topics.bulkMaxLines) {
    throw new AppError("input_too_large", {
      details: { limit: config.topics.bulkMaxLines, actual: lines.length },
    });
  }
}

/** TOP-03 dry run: flags duplicates against the subject and against earlier lines. */
export async function previewBulkTopics(
  database: Queryable,
  userId: string,
  subjectId: string,
  lines: readonly string[],
): Promise<BulkTopicsPreview> {
  await requireActiveSubject(database, userId, subjectId);
  const { lines: kept, tooLong } = normaliseBulkLines(lines);
  assertBulkSize(kept);

  const existing = await database.query<{ name: string }>(
    `SELECT lower(btrim(name)) AS name FROM topics
     WHERE subject_id = $1 AND user_id = $2 AND archived_at IS NULL`,
    [subjectId, userId],
  );
  const taken = new Set(existing.map((row) => row.name));
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const valid: string[] = [];

  for (const line of kept) {
    const key = line.toLowerCase();
    if (taken.has(key) || seen.has(key)) {
      if (!duplicates.includes(line)) duplicates.push(line);
      continue;
    }
    seen.add(key);
    if (line.length <= config.topics.nameMaxLength) valid.push(line);
  }

  return { valid, duplicates, tooLong };
}

/**
 * TOP-03 save: every kept line becomes a topic with weight 1 and status `not_started`, in
 * input order. A single over-long line fails the whole save (AC-FR-017-3); duplicates are
 * a preview flag only, so the save creates them.
 */
export async function bulkCreateTopics(
  database: Queryable,
  userId: string,
  subjectId: string,
  lines: readonly string[],
  now: Date,
): Promise<Topic[]> {
  const subject = await requireActiveSubject(database, userId, subjectId);
  const { lines: kept, tooLong } = normaliseBulkLines(lines);
  assertBulkSize(kept);
  if (tooLong.length > 0) {
    throw fieldsError("lines", "length", { max: config.topics.nameMaxLength, tooLong });
  }

  const rows = await database.query<{ position: number | null }>(
    "SELECT MAX(position) AS position FROM topics WHERE subject_id = $1 AND archived_at IS NULL",
    [subject.id],
  );
  const start = (rows[0]?.position ?? -1) + 1;

  const created: Topic[] = [];
  for (const [offset, line] of kept.entries()) {
    const id = uuidv7();
    await database.query(
      `INSERT INTO topics (id, user_id, subject_id, name, weight, status, position, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 1, 'not_started', $5, $6, $6)`,
      [id, userId, subject.id, line, start + offset, now],
    );
    created.push(await getTopic(database, userId, id));
  }
  return created;
}

/** Registered purge handler (MODULE-BOUNDARIES section 3, NFR-031). */
export async function purgeTopics(userId: string, database: Queryable): Promise<number> {
  const rows = await database.query<{ id: string }>(
    "DELETE FROM topics WHERE user_id = $1 RETURNING id",
    [userId],
  );
  return rows.length;
}

/** Registered export contributor (FR-130, FR-131). */
export async function exportTopics(userId: string, database: Queryable): Promise<unknown[]> {
  const rows = await database.query<Record<string, unknown>>(
    `SELECT id, subject_id, name, weight, status, position, archived_at, created_at, updated_at
     FROM topics WHERE user_id = $1 ORDER BY subject_id, position, id`,
    [userId],
  );
  return rows;
}
