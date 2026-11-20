/**
 * NFR-013: opaque session identifiers, looked up in the database on every request.
 * The cookie carries the raw token; the row stores only its SHA-256, so a database
 * read never yields a usable credential.
 *
 * Sliding expiry: each accepted request extends `last_active_at` and `expires_at`.
 * Revocation and expiry are checked against the stored row, so both take effect on
 * the next request.
 */
import { config } from "../../kernel/config";
import { randomToken, sha256Hex, uuidv7 } from "../../kernel/crypto";
import type { Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";

export interface SessionIdentity {
  userId: string;
  sessionId: string;
}

export interface NewSession {
  rawToken: string;
  sessionId: string;
  expiresAt: Date;
}

const LIFETIME_MS = config.auth.sessionLifetimeDays * 24 * 60 * 60 * 1000;

export async function createSession(
  database: Queryable,
  userId: string,
  context: { ip: string | null; userAgent: string | null },
  now: Date,
): Promise<NewSession> {
  const rawToken = randomToken();
  const sessionId = uuidv7();
  const expiresAt = new Date(now.getTime() + LIFETIME_MS);

  await database.query(
    `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, last_active_at, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      sessionId,
      userId,
      sha256Hex(rawToken),
      expiresAt.toISOString(),
      now.toISOString(),
      context.ip,
      context.userAgent?.slice(0, 512) ?? null,
    ],
  );

  return { rawToken, sessionId, expiresAt };
}

export interface SessionRow {
  id: string;
  user_id: string;
  revoked_at: Date | null;
  expires_at: Date;
}

/**
 * Resolves a raw cookie token. A missing row is `unauthenticated`; a revoked row is
 * `session_revoked`; an expired row is `session_expired` (API-SECURITY section 1.1).
 */
export async function resolveSession(
  database: Queryable,
  rawToken: string | undefined,
  now: Date,
): Promise<SessionIdentity> {
  if (rawToken === undefined || rawToken.length === 0) throw new AppError("unauthenticated");

  const row = await database.query<SessionRow>(
    `SELECT id, user_id, revoked_at, expires_at
     FROM auth_sessions
     WHERE token_hash = $1`,
    [sha256Hex(rawToken)],
  );
  const session = row[0];
  if (session === undefined) throw new AppError("unauthenticated");
  if (session.revoked_at !== null) throw new AppError("session_revoked");
  if (session.expires_at.getTime() <= now.getTime()) throw new AppError("session_expired");

  await database.query(
    `UPDATE auth_sessions
     SET last_active_at = $2, expires_at = $3
     WHERE id = $1`,
    [session.id, now.toISOString(), new Date(now.getTime() + LIFETIME_MS).toISOString()],
  );

  return { userId: session.user_id, sessionId: session.id };
}

export async function revokeSessionById(
  database: Queryable,
  sessionId: string,
  now: Date,
): Promise<boolean> {
  const rows = await database.query<{ id: string }>(
    `UPDATE auth_sessions SET revoked_at = $2
     WHERE id = $1 AND revoked_at IS NULL AND expires_at > $2
     RETURNING id`,
    [sessionId, now.toISOString()],
  );
  return rows.length > 0;
}

/** Returns the session ids revoked, so the caller can audit one event per session. */
export async function revokeAllSessions(
  database: Queryable,
  userId: string,
  now: Date,
  exceptSessionId?: string,
): Promise<string[]> {
  const rows = await database.query<{ id: string }>(
    `UPDATE auth_sessions SET revoked_at = $2
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > $2 AND id <> $3
     RETURNING id`,
    [userId, now.toISOString(), exceptSessionId ?? "00000000-0000-0000-0000-000000000000"],
  );
  return rows.map((row) => row.id);
}

export interface SignInRow {
  id: string;
  last_active_at: Date;
  created_at: Date;
  user_agent: string | null;
}

export async function listActiveSessions(
  database: Queryable,
  userId: string,
  now: Date,
): Promise<SignInRow[]> {
  return database.query<SignInRow>(
    `SELECT id, last_active_at, created_at, user_agent
     FROM auth_sessions
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > $2
     ORDER BY last_active_at DESC, id`,
    [userId, now.toISOString()],
  );
}