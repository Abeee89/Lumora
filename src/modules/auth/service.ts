/**
 * Authentication use cases (FR-001..FR-005, FR-008): register, sign in with lockout,
 * sign out, password reset, sign-in listing and revocation.
 *
 * Services receive a `Queryable`, so the caller owns the transaction; they never read a
 * cookie, a header or a request object (MODULE-BOUNDARIES section 5).
 */
import { config } from "../../kernel/config";
import { randomToken, sha256Hex, uuidv7 } from "../../kernel/crypto";
import type { Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import type { RateLimiter } from "../../kernel/rate-limit";
import { assertIanaZone } from "../../kernel/time";

import { writeAuditEvent, type AuditContext } from "./audit";
import type { EmailMessage, MessageSender } from "./email-port";
import { hashPassword, verifyAgainstNothing, verifyPassword } from "./password";
import {
  createSession,
  listActiveSessions,
  resolveSession,
  revokeAllSessions,
  revokeSessionById,
  type NewSession,
  type SessionIdentity,
  type SignInRow,
} from "./sessions";

export interface AuthDeps {
  clock: () => Date;
  limiter: RateLimiter;
  appOrigin: string;
  sender: MessageSender | null;
}

export type RequestContext = AuditContext;

export interface RegisterInput {
  email: string;
  password: string;
  ageConfirmed: boolean;
  timezone: string;
}

export interface RegisteredAccount {
  userId: string;
  email: string;
  session: NewSession;
}

interface UserRow {
  id: string;
  email: string;
  failed_sign_in_count: number;
  locked_until: Date | null;
  deletion_requested_at: Date | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertPassword(password: string, minimum: number): void {
  if (password.length < minimum) {
    throw new AppError("password_too_short", { details: { minLength: minimum } });
  }
}

function assertZone(timezone: string): string {
  try {
    return assertIanaZone(timezone);
  } catch {
    throw new AppError("invalid_timezone", { details: { timezone } });
  }
}

/** FR-003: the Google email is already verified, and the state carried the age gate. */
export async function createVerifiedUser(
  database: Queryable,
  email: string,
  now: Date,
): Promise<string> {
  const userId = uuidv7();
  await database.query(
    `INSERT INTO users (id, email, email_verified, age_confirmed_at)
     VALUES ($1, $2, true, $3)`,
    [userId, normalizeEmail(email), now.toISOString()],
  );
  return userId;
}

async function consume(deps: AuthDeps, bucket: string, limit: number): Promise<void> {
  const result = await deps.limiter.consume(bucket, limit, config.rateLimit.windowSeconds);
  if (!result.allowed) {
    throw new AppError("rate_limited", { retryAfter: result.resetSeconds });
  }
}

async function findUserByEmail(database: Queryable, email: string, lock: boolean): Promise<UserRow | undefined> {
  const rows = await database.query<UserRow>(
    `SELECT id, email, failed_sign_in_count, locked_until, deletion_requested_at
     FROM users
     WHERE lower(email) = $1${lock ? " FOR UPDATE" : ""}`,
    [email],
  );
  return rows[0];
}

/** AUTH-01. The caller creates the profile row and commits both together. */
export async function registerWithPassword(
  database: Queryable,
  deps: AuthDeps,
  input: RegisterInput,
  context: RequestContext,
): Promise<RegisteredAccount> {
  await consume(deps, `signup:${context.ip ?? "unknown"}`, config.rateLimit.signUpPerIpPerMinute);

  const email = normalizeEmail(input.email);
  if (!input.ageConfirmed) throw new AppError("age_confirmation_required");
  assertPassword(input.password, config.auth.passwordMinLength);
  assertZone(input.timezone);

  const now = deps.clock();
  const existing = await findUserByEmail(database, email, false);
  if (existing !== undefined) throw new AppError("duplicate_email");

  const userId = uuidv7();
  const passwordHash = await hashPassword(input.password);

  try {
    await database.query(
      `INSERT INTO users (id, email, email_verified, age_confirmed_at)
       VALUES ($1, $2, false, $3)`,
      [userId, email, now.toISOString()],
    );
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("duplicate_email", { cause: error });
    throw error;
  }

  await database.query(
    `INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, password_hash)
     VALUES ($1, $2, 'credential', $3, $4)`,
    [uuidv7(), userId, userId, passwordHash],
  );

  const session = await createSession(database, userId, context, now);
  await writeAuditEvent(database, "sign_in", userId, context);

  return { userId, email, session };
}

export interface SignInInput {
  email: string;
  password: string;
}

interface CredentialRow {
  password_hash: string | null;
}

/** AUTH-02. The lock is checked before the password so a correct one is refused. */
export async function signInWithPassword(
  database: Queryable,
  deps: AuthDeps,
  input: SignInInput,
  context: RequestContext,
): Promise<{ userId: string; session: NewSession }> {
  await consume(deps, `signin:${context.ip ?? "unknown"}`, config.rateLimit.signInPerIpPerMinute);

  const email = normalizeEmail(input.email);
  const now = deps.clock();
  const user = await findUserByEmail(database, email, true);

  if (user === undefined || user.deletion_requested_at !== null) {
    await verifyAgainstNothing(input.password);
    throw new AppError("invalid_credentials");
  }

  if (user.locked_until !== null && user.locked_until.getTime() > now.getTime()) {
    throw lockedError(user.locked_until, now);
  }

  const credential = await database.query<CredentialRow>(
    `SELECT password_hash FROM auth_accounts
     WHERE user_id = $1 AND provider = 'credential'`,
    [user.id],
  );
  const stored = credential[0]?.password_hash;
  const valid = stored === undefined || stored === null
    ? await verifyAgainstNothing(input.password)
    : await verifyPassword(input.password, stored);

  if (!valid) {
    const failures = user.failed_sign_in_count + 1;
    const lockedUntil =
      failures >= config.auth.lockoutFailureThreshold
        ? new Date(now.getTime() + config.auth.lockoutMinutes * 60 * 1000)
        : null;

    await database.query(
      `UPDATE users SET failed_sign_in_count = $2, locked_until = $3, updated_at = $4 WHERE id = $1`,
      [user.id, failures, lockedUntil?.toISOString() ?? null, now.toISOString()],
    );

    if (lockedUntil !== null) {
      await writeAuditEvent(database, "lockout", user.id, context);
      throw lockedError(lockedUntil, now);
    }
    await writeAuditEvent(database, "sign_in_failed", user.id, context);
    throw new AppError("invalid_credentials");
  }

  await database.query(
    `UPDATE users SET failed_sign_in_count = 0, locked_until = NULL, updated_at = $2 WHERE id = $1`,
    [user.id, now.toISOString()],
  );

  const session = await createSession(database, user.id, context, now);
  await writeAuditEvent(database, "sign_in", user.id, context);
  return { userId: user.id, session };
}

function lockedError(lockedUntil: Date, now: Date): AppError {
  const seconds = Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
  return new AppError("account_locked", {
    details: { lockedUntil: lockedUntil.toISOString() },
    retryAfter: seconds,
  });
}

/** AUTH-04. Revokes only the session that made the request. */
export async function signOut(
  database: Queryable,
  deps: AuthDeps,
  identity: SessionIdentity,
  context: RequestContext,
): Promise<void> {
  const revoked = await revokeSessionById(database, identity.sessionId, deps.clock());
  if (!revoked) throw new AppError("unauthenticated");
  await writeAuditEvent(database, "session_revoked", identity.userId, context);
}

export interface ResetDelivery {
  message: EmailMessage;
  token: string;
}

/**
 * AUTH-05. Returns the message to deliver when the account exists and `null` otherwise;
 * the caller sends it after commit so the response never waits for the provider and the
 * two paths look identical (AC-FR-005-1).
 */
export async function requestPasswordReset(
  database: Queryable,
  deps: AuthDeps,
  email: string,
  context: RequestContext,
): Promise<ResetDelivery | null> {
  const normalized = normalizeEmail(email);
  await consume(deps, `reset:${context.ip ?? "unknown"}`, config.rateLimit.resetPerIpPerMinute);
  await consume(deps, `reset:${sha256Hex(normalized)}`, config.rateLimit.resetPerEmailPerMinute);

  const user = await findUserByEmail(database, normalized, false);
  if (user === undefined || user.deletion_requested_at !== null) return null;

  const now = deps.clock();
  const token = randomToken();
  const expiresAt = new Date(now.getTime() + config.auth.resetTokenMinutes * 60 * 1000);

  await database.query(
    `INSERT INTO auth_verifications (id, user_id, purpose, token_hash, expires_at)
     VALUES ($1, $2, 'password_reset', $3, $4)`,
    [uuidv7(), user.id, sha256Hex(token), expiresAt.toISOString()],
  );

  return {
    token,
    message: {
      to: user.email,
      subject: "Reset your Lumora password",
      text:
        `Use this link to choose a new password. It works once and expires in ` +
        `${config.auth.resetTokenMinutes} minutes.\n\n` +
        `${deps.appOrigin}/reset-password?token=${encodeURIComponent(token)}\n\n` +
        `If you did not ask for this, you can ignore the message.`,
    },
  };
}

interface VerificationRow {
  id: string;
  user_id: string;
  expires_at: Date;
  consumed_at: Date | null;
}

/** AUTH-06. Single use, revokes every session, clears the lockout (AC-FR-005-2, 3). */
export async function completePasswordReset(
  database: Queryable,
  deps: AuthDeps,
  input: { token: string; newPassword: string },
  context: RequestContext,
): Promise<void> {
  assertPassword(input.newPassword, config.auth.passwordMinLength);
  await consume(deps, `reset:${context.ip ?? "unknown"}`, config.rateLimit.resetPerIpPerMinute);

  const now = deps.clock();
  const rows = await database.query<VerificationRow>(
    `SELECT id, user_id, expires_at, consumed_at
     FROM auth_verifications
     WHERE token_hash = $1 AND purpose = 'password_reset'
     FOR UPDATE`,
    [sha256Hex(input.token)],
  );
  const verification = rows[0];
  if (
    verification === undefined ||
    verification.consumed_at !== null ||
    verification.expires_at.getTime() <= now.getTime()
  ) {
    throw new AppError("reset_token_invalid");
  }

  const passwordHash = await hashPassword(input.newPassword);

  await database.query(
    `UPDATE auth_verifications SET consumed_at = $2 WHERE id = $1`,
    [verification.id, now.toISOString()],
  );

  // FR-005: a Google-only account sets its first password here.
  const updated = await database.query<{ id: string }>(
    `UPDATE auth_accounts SET password_hash = $2, updated_at = $3
     WHERE user_id = $1 AND provider = 'credential'
     RETURNING id`,
    [verification.user_id, passwordHash, now.toISOString()],
  );
  if (updated.length === 0) {
    await database.query(
      `INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, password_hash)
       VALUES ($1, $2, 'credential', $3, $4)`,
      [uuidv7(), verification.user_id, verification.user_id, passwordHash],
    );
  }

  await database.query(
    `UPDATE users
     SET failed_sign_in_count = 0, locked_until = NULL, updated_at = $2
     WHERE id = $1`,
    [verification.user_id, now.toISOString()],
  );

  const revoked = await revokeAllSessions(database, verification.user_id, now);
  for (let index = 0; index < revoked.length; index += 1) {
    await writeAuditEvent(database, "session_revoked", verification.user_id, context);
  }
  await writeAuditEvent(database, "password_reset", verification.user_id, context);
}

export interface SignInView {
  id: string;
  current: boolean;
  device: string;
  lastActiveAt: string;
  createdAt: string;
}

/** AUTH-07. IP, token hash and expiry are never returned (API-SCHEMAS section 3). */
export async function listSignIns(
  database: Queryable,
  deps: AuthDeps,
  identity: SessionIdentity,
): Promise<SignInView[]> {
  const rows = await listActiveSessions(database, identity.userId, deps.clock());
  return rows.map((row) => present(row, identity.sessionId));
}

function present(row: SignInRow, currentSessionId: string): SignInView {
  return {
    id: row.id,
    current: row.id === currentSessionId,
    device: deviceLabel(row.user_agent),
    lastActiveAt: row.last_active_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

/** A short, human label from the stored user agent; never the raw string (NFR-063). */
export function deviceLabel(userAgent: string | null): string {
  if (userAgent === null || userAgent.trim().length === 0) return "Unknown device";
  const agent = userAgent.toLowerCase();
  // iOS browsers keep Safari's engine token and only brand themselves: CriOS, FxiOS, EdgiOS.
  const browser = agent.includes("edg/") || agent.includes("edgios")
    ? "Edge"
    : agent.includes("firefox") || agent.includes("fxios")
      ? "Firefox"
      : agent.includes("chrome") || agent.includes("chromium") || agent.includes("crios")
        ? "Chrome"
        : agent.includes("safari")
          ? "Safari"
          : "Browser";
  const platform = agent.includes("iphone")
    ? "iPhone"
    : agent.includes("ipad")
      ? "iPad"
      : agent.includes("android")
        ? "Android"
        : agent.includes("mac os")
          ? "macOS"
          : agent.includes("windows")
            ? "Windows"
            : agent.includes("linux")
              ? "Linux"
              : "Unknown platform";
  return `${browser} on ${platform}`;
}

/** AUTH-08. The current session and foreign ids are refused as specified. */
export async function revokeSignIn(
  database: Queryable,
  deps: AuthDeps,
  identity: SessionIdentity,
  signInId: string,
  context: RequestContext,
): Promise<void> {
  if (signInId === identity.sessionId) {
    throw new AppError("validation_failed", {
      details: { fields: [{ path: "signInId", rule: "current_session" }] },
    });
  }
  const rows = await database.query<{ id: string }>(
    `SELECT id FROM auth_sessions
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > $3`,
    [signInId, identity.userId, deps.clock().toISOString()],
  );
  if (rows.length === 0) throw new AppError("not_found");

  await revokeSessionById(database, signInId, deps.clock());
  await writeAuditEvent(database, "session_revoked", identity.userId, context);
}

/** AUTH-09. One audit event per revoked session. */
export async function revokeOtherSignIns(
  database: Queryable,
  deps: AuthDeps,
  identity: SessionIdentity,
  context: RequestContext,
): Promise<number> {
  const revoked = await revokeAllSessions(database, identity.userId, deps.clock(), identity.sessionId);
  for (let index = 0; index < revoked.length; index += 1) {
    await writeAuditEvent(database, "session_revoked", identity.userId, context);
  }
  return revoked.length;
}

/** Resolves the caller for an `S` endpoint; a pending deletion is unauthenticated. */
export async function currentIdentity(
  database: Queryable,
  deps: AuthDeps,
  rawToken: string | undefined,
): Promise<SessionIdentity> {
  const identity = await resolveSession(database, rawToken, deps.clock());
  const rows = await database.query<{ deletion_requested_at: Date | null }>(
    "SELECT deletion_requested_at FROM users WHERE id = $1",
    [identity.userId],
  );
  if (rows[0] === undefined || rows[0].deletion_requested_at !== null) {
    throw new AppError("unauthenticated");
  }
  return identity;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export type { MessageSender } from "./email-port";