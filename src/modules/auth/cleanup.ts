/**
 * NFR-031 and NFR-020 housekeeping for the Authentication tables. The job runner calls
 * these; nothing here decides the schedule.
 */
import { config } from "../../kernel/config";
import type { Queryable } from "../../kernel/db";

export async function purgeExpiredSessions(
  database: Queryable,
  now: Date,
): Promise<number> {
  const rows = await database.query<{ id: string }>(
    "DELETE FROM auth_sessions WHERE expires_at < $1 RETURNING id",
    [now.toISOString()],
  );
  return rows.length;
}

export async function purgeExpiredResetTokens(
  database: Queryable,
  now: Date,
): Promise<number> {
  const rows = await database.query<{ id: string }>(
    `DELETE FROM auth_verifications
     WHERE purpose = 'password_reset' AND (expires_at < $1 OR consumed_at IS NOT NULL)
     RETURNING id`,
    [now.toISOString()],
  );
  return rows.length;
}

/** Writes the terminal audit row and deletes the user, cascading every owned row. */
export async function purgeUser(database: Queryable, userId: string, now: Date): Promise<number> {
  await database.query(
    `INSERT INTO auth_audit_events (id, user_id, event_type, occurred_at)
     VALUES (gen_random_uuid(), NULL, 'account_deleted', $1)`,
    [now.toISOString()],
  );
  const rows = await database.query<{ id: string }>(
    "DELETE FROM users WHERE id = $1 RETURNING id",
    [userId],
  );
  return rows.length;
}

export function auditRetentionCutoff(now: Date): Date {
  return new Date(now.getTime() - config.auth.auditRetentionDays * 24 * 60 * 60 * 1000);
}