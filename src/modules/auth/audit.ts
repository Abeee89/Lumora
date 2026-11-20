/**
 * NFR-020: sign-in, lockout, reset and revocation events, kept 90 days.
 * `account_deleted` rows are written before the cascade removes the user (the FK is
 * nullable for exactly that case).
 */
import { uuidv7 } from "../../kernel/crypto";
import type { Queryable } from "../../kernel/db";

export const auditEventTypes = [
  "sign_in",
  "sign_in_failed",
  "lockout",
  "password_reset",
  "session_revoked",
  "account_deleted",
] as const;

export type AuditEventType = (typeof auditEventTypes)[number];

export interface AuditContext {
  ip: string | null;
  userAgent: string | null;
}

export async function writeAuditEvent(
  database: Queryable,
  eventType: AuditEventType,
  userId: string | null,
  context: AuditContext,
): Promise<void> {
  await database.query(
    `INSERT INTO auth_audit_events (id, user_id, event_type, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv7(), userId, eventType, context.ip, context.userAgent?.slice(0, 512) ?? null],
  );
}

/** Daily job: NFR-020 keeps 90 days. Returns the number of rows removed. */
export async function deleteAuditEventsBefore(database: Queryable, before: Date): Promise<number> {
  const rows = await database.query<{ id: string }>(
    "DELETE FROM auth_audit_events WHERE occurred_at < $1 RETURNING id",
    [before.toISOString()],
  );
  return rows.length;
}