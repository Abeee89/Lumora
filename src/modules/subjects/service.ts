/**
 * Subjects (FR-010..FR-014): one row per subject, versioned for optimistic concurrency
 * (ADR-011). A subject is never deleted: archiving hides it and history keeps pointing at
 * the row, labelled "<name> (archived)" (BR-029, NFR-093).
 *
 * `Subject` is the wire shape of API-SCHEMAS section 5; `SubjectListItem` adds the two
 * counts A-7 prints beside the name, the way `ExamListItem` adds its counts to `Exam`.
 */
import { config } from "../../kernel/config";
import { uuidv7 } from "../../kernel/crypto";
import type { Database, Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import { archiveGuards } from "../../kernel/registries";

export type SubjectColor = (typeof config.subjects.palette)[number]["key"];

/** FR-010: the fixed palette; the keys validate `color`, the labels name the swatches. */
export const subjectPalette: readonly { key: string; label: string }[] = config.subjects.palette;

export interface Subject {
  id: string;
  name: string;
  color: string;
  position: number;
  archivedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectListItem extends Subject {
  /** Active topics of this subject (A-7 "topic count"). */
  topicCount: number;
  /** Of those, the ones with status `done` (A-7 "Done" count). */
  doneTopicCount: number;
}

export interface SubjectPatch {
  name?: string;
  color?: string;
}

interface SubjectRow {
  id: string;
  name: string;
  color: string;
  position: number;
  archived_at: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  topic_count: number;
  done_topic_count: number;
}

const SELECT_SUBJECT = `
  SELECT s.id, s.name, s.color, s.position, s.archived_at, s.version, s.created_at, s.updated_at,
         (SELECT COUNT(*)::int FROM topics t
           WHERE t.subject_id = s.id AND t.archived_at IS NULL) AS topic_count,
         (SELECT COUNT(*)::int FROM topics t
           WHERE t.subject_id = s.id AND t.archived_at IS NULL AND t.status = 'done') AS done_topic_count
  FROM subjects s`;

function present(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position,
    archivedAt: row.archived_at?.toISOString() ?? null,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function presentListItem(row: SubjectRow): SubjectListItem {
  return { ...present(row), topicCount: row.topic_count, doneTopicCount: row.done_topic_count };
}

export function isSubjectColor(value: string): value is SubjectColor {
  return subjectPalette.some((entry) => entry.key === value);
}

function validateName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > config.subjects.nameMaxLength) {
    throw new AppError("validation_failed", {
      details: {
        fields: [
          { path: "name", rule: "length", min: 1, max: config.subjects.nameMaxLength },
        ],
      },
    });
  }
  return trimmed;
}

function validateColor(value: string): SubjectColor {
  if (!isSubjectColor(value)) {
    throw new AppError("validation_failed", { details: { fields: [{ path: "color", rule: "enum" }] } });
  }
  return value;
}

function fieldsError(path: string, rule: string, extra: Record<string, unknown> = {}): AppError {
  return new AppError("validation_failed", { details: { fields: [{ path, rule, ...extra }] } });
}

/** Every unique violation on `subjects` that can happen here is the active-name index. */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "23505";
}

/**
 * The active-name index is the referee (AC-FR-010-3). A rejected write aborts its
 * transaction, so this maps the error without querying that transaction again; the
 * create path names the conflicting row instead (see `createSubject`).
 */
function mapNameConflict(error: unknown): Error {
  if (isUniqueViolation(error)) {
    return new AppError("name_conflict", { details: { field: "name" } });
  }
  return error instanceof Error ? error : new Error(String(error));
}

/** SUBJ-01. Active first, then archived, both by `position` then `id` (AC-FR-013-3). */
export async function listSubjects(
  database: Queryable,
  userId: string,
  includeArchived: boolean,
): Promise<SubjectListItem[]> {
  const rows = await database.query<SubjectRow>(
    `${SELECT_SUBJECT}
     WHERE s.user_id = $1 AND ($2 OR s.archived_at IS NULL)
     ORDER BY (s.archived_at IS NOT NULL), s.position, s.id`,
    [userId, includeArchived],
  );
  return rows.map(presentListItem);
}

/** SUBJ-03, and the ownership check the Topics module calls before touching a subject. */
export async function getSubject(
  database: Queryable,
  userId: string,
  subjectId: string,
): Promise<Subject> {
  const rows = await database.query<SubjectRow>(
    `${SELECT_SUBJECT} WHERE s.id = $1 AND s.user_id = $2`,
    [subjectId, userId],
  );
  const row = rows[0];
  if (row === undefined) throw new AppError("not_found");
  return present(row);
}

/** SUBJ-02. Position is the last active slot (FR-012); `id` is a UUIDv7 like every row. */
export async function createSubject(
  database: Queryable,
  userId: string,
  input: { name: string; color: string },
  now: Date,
): Promise<Subject> {
  const name = validateName(input.name);
  const color = validateColor(input.color);
  const id = uuidv7();

  // ON CONFLICT keeps the transaction usable, so the clashing row can still be named.
  const inserted = await database.query<{ id: string }>(
    `INSERT INTO subjects (id, user_id, name, color, position, created_at, updated_at)
     VALUES ($1, $2, $3, $4,
             (SELECT COALESCE(MAX(position) + 1, 0) FROM subjects
               WHERE user_id = $2 AND archived_at IS NULL),
             $5, $5)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [id, userId, name, color, now],
  );
  if (inserted.length === 0) {
    const clashes = await database.query<{ id: string }>(
      `SELECT id FROM subjects
       WHERE user_id = $1 AND archived_at IS NULL AND lower(btrim(name)) = lower(btrim($2))`,
      [userId, name],
    );
    throw new AppError("name_conflict", {
      details: { field: "name", conflictingId: clashes[0]?.id ?? null },
    });
  }

  return getSubject(database, userId, id);
}

/**
 * SUBJ-04. A case-only rename is allowed because the subject itself is excluded from the
 * uniqueness check. On an archived subject only `name` may change: that rename is the
 * first step of the restore conflict flow (AC-FR-014-3) and carries no uniqueness check,
 * because the unique index covers active names only.
 */
export async function editSubject(
  database: Queryable,
  userId: string,
  subjectId: string,
  expectedVersion: number | null,
  patch: SubjectPatch,
  now: Date,
): Promise<Subject> {
  if (expectedVersion === null) throw new AppError("version_required");
  if (patch.name === undefined && patch.color === undefined) {
    throw fieldsError("body", "at_least_one_field");
  }

  const current = await getSubject(database, userId, subjectId);
  if (current.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current } });
  }
  const archived = current.archivedAt !== null;
  if (patch.color !== undefined && archived) {
    throw new AppError("subject_archived", { details: { subjectId } });
  }

  const assignments: string[] = [];
  const values: unknown[] = [userId, subjectId, expectedVersion, now];

  if (patch.name !== undefined) {
    const name = validateName(patch.name);
    if (!archived) {
      const clashes = await database.query<{ id: string }>(
        `SELECT id FROM subjects
         WHERE user_id = $1 AND archived_at IS NULL AND id <> $2
           AND lower(btrim(name)) = lower(btrim($3))`,
        [userId, subjectId, name],
      );
      const conflicting = clashes[0];
      if (conflicting !== undefined) {
        throw new AppError("name_conflict", {
          details: { field: "name", conflictingId: conflicting.id },
        });
      }
    }
    values.push(name);
    assignments.push(`name = $${values.length}`);
  }
  if (patch.color !== undefined) {
    values.push(validateColor(patch.color));
    assignments.push(`color = $${values.length}`);
  }

  let rows: { id: string }[];
  try {
    rows = await database.query<{ id: string }>(
      `UPDATE subjects
       SET ${assignments.join(", ")}, version = version + 1, updated_at = $4
       WHERE user_id = $1 AND id = $2 AND version = $3
       RETURNING id`,
      values,
    );
  } catch (error) {
    throw mapNameConflict(error);
  }

  if (rows.length === 0) {
    const fresh = await getSubject(database, userId, subjectId);
    throw new AppError("stale_version", { details: { current: fresh } });
  }

  return getSubject(database, userId, subjectId);
}

/**
 * SUBJ-05. The full-set check replaces `If-Match`: `subjectIds` must be exactly the
 * caller's active subjects, each once, and the rewrite is atomic (API-CONVENTIONS 6).
 */
export async function reorderSubjects(
  database: Database,
  userId: string,
  subjectIds: readonly string[],
  now: Date,
): Promise<Subject[]> {
  const active = await database.query<{ id: string }>(
    "SELECT id FROM subjects WHERE user_id = $1 AND archived_at IS NULL",
    [userId],
  );
  const activeIds = new Set(active.map((row) => row.id));
  const seen = new Set<string>();
  for (const id of subjectIds) {
    if (!activeIds.has(id) || seen.has(id)) throw fieldsError("subjectIds", "full_set");
    seen.add(id);
  }
  if (seen.size !== activeIds.size) throw fieldsError("subjectIds", "full_set");

  await database.transaction(async (tx) => {
    for (const [position, id] of subjectIds.entries()) {
      await tx.query(
        `UPDATE subjects SET position = $3, version = version + 1, updated_at = $4
         WHERE user_id = $1 AND id = $2`,
        [userId, id, position, now],
      );
    }
  });

  return listActiveSubjects(database, userId);
}

async function listActiveSubjects(database: Queryable, userId: string): Promise<Subject[]> {
  const rows = await database.query<SubjectRow>(
    `${SELECT_SUBJECT} WHERE s.user_id = $1 AND s.archived_at IS NULL ORDER BY s.position, s.id`,
    [userId],
  );
  return rows.map(present);
}

/**
 * SUBJ-06. The archive guard is the inversion point Subjects owns (MODULE-BOUNDARIES
 * section 3): Timer registers "is a run active on this subject?" and no registration means
 * the archive proceeds. Archiving an archived subject with a matching version is a no-op
 * that still answers 200.
 */
export async function archiveSubject(
  database: Queryable,
  userId: string,
  subjectId: string,
  expectedVersion: number | null,
  now: Date,
): Promise<Subject> {
  if (expectedVersion === null) throw new AppError("version_required");

  const current = await getSubject(database, userId, subjectId);
  if (current.archivedAt !== null && current.version === expectedVersion) return current;
  if (current.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current } });
  }

  for (const [source, guard] of archiveGuards.entries()) {
    const verdict = await guard(subjectId);
    if (verdict.blocked) {
      throw new AppError("subject_has_running_session", {
        details: verdict.details ?? { subjectId, guard: source },
      });
    }
  }

  const rows = await database.query<{ id: string }>(
    `UPDATE subjects SET archived_at = $4, version = version + 1, updated_at = $4
     WHERE user_id = $1 AND id = $2 AND version = $3
     RETURNING id`,
    [userId, subjectId, expectedVersion, now],
  );
  if (rows.length === 0) {
    const fresh = await getSubject(database, userId, subjectId);
    throw new AppError("stale_version", { details: { current: fresh } });
  }

  return getSubject(database, userId, subjectId);
}

/**
 * SUBJ-07. Restored last among the active subjects. An active subject holding the same
 * name blocks the restore with `name_conflict` and nothing changes: the client renames
 * through SUBJ-04 and retries (AC-FR-014-3).
 */
export async function restoreSubject(
  database: Queryable,
  userId: string,
  subjectId: string,
  expectedVersion: number | null,
  now: Date,
): Promise<Subject> {
  if (expectedVersion === null) throw new AppError("version_required");

  const current = await getSubject(database, userId, subjectId);
  if (current.archivedAt === null && current.version === expectedVersion) return current;
  if (current.version !== expectedVersion) {
    throw new AppError("stale_version", { details: { current } });
  }

  const clashes = await database.query<{ id: string }>(
    `SELECT id FROM subjects
     WHERE user_id = $1 AND archived_at IS NULL AND id <> $2
       AND lower(btrim(name)) = lower(btrim($3))`,
    [userId, subjectId, current.name],
  );
  const conflicting = clashes[0];
  if (conflicting !== undefined) {
    throw new AppError("name_conflict", {
      details: { field: "name", conflictingId: conflicting.id },
    });
  }

  let rows: { id: string }[];
  try {
    rows = await database.query<{ id: string }>(
      `UPDATE subjects
       SET archived_at = NULL,
           position = (SELECT COALESCE(MAX(position) + 1, 0) FROM subjects
                        WHERE user_id = $1 AND archived_at IS NULL),
           version = version + 1, updated_at = $4
       WHERE user_id = $1 AND id = $2 AND version = $3
       RETURNING id`,
      [userId, subjectId, expectedVersion, now],
    );
  } catch (error) {
    throw mapNameConflict(error);
  }
  if (rows.length === 0) {
    const fresh = await getSubject(database, userId, subjectId);
    throw new AppError("stale_version", { details: { current: fresh } });
  }

  return getSubject(database, userId, subjectId);
}

/** Registered purge handler (MODULE-BOUNDARIES section 3, NFR-031). */
export async function purgeSubjects(userId: string, database: Queryable): Promise<number> {
  const rows = await database.query<{ id: string }>(
    "DELETE FROM subjects WHERE user_id = $1 RETURNING id",
    [userId],
  );
  return rows.length;
}

/** Registered export contributor (FR-130, FR-131). */
export async function exportSubjects(userId: string, database: Queryable): Promise<unknown[]> {
  const rows = await database.query<Record<string, unknown>>(
    `SELECT id, name, color, position, archived_at, created_at, updated_at
     FROM subjects WHERE user_id = $1 ORDER BY position, id`,
    [userId],
  );
  return rows;
}
