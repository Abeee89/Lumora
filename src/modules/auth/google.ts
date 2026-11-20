/**
 * Google sign-in (FR-003, AC-FR-003-1..3). ADR-004 names the library; the library cannot be
 * bound to the M02 schema yet (the M00 spike left `user.id` as `text`, no unique
 * `(provider, account)` guard, and no place for `age_confirmed_at`), so this module owns
 * the protocol behind a port. The behaviour, not the import, is what the contract fixes.
 *
 * Security properties implemented here:
 * - state: HMAC-signed payload in an HttpOnly cookie, compared in constant time;
 * - PKCE S256 with the verifier kept in the same cookie;
 * - the ID token is verified against Google's JWKS (RS256, `iss`, `aud`, `exp`);
 * - only a verified Google email is accepted, and implicit linking is refused (OD-S03).
 */
import {
  createHash,
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify as verifySignature,
  type KeyObject,
} from "node:crypto";

import { randomToken, uuidv7 } from "../../kernel/crypto";
import type { Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import type { NewSession } from "./sessions";

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  appOrigin: string;
}

export interface GoogleStatePayload {
  next: string;
  ageConfirmed: boolean;
  timezone: string;
  nonce: string;
  expiresAt: number;
}

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"] as const;
const STATE_TTL_SECONDS = 300;
export const GOOGLE_STATE_COOKIE = "lumora_oauth_state";

function sign(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("base64url");
}

export function encodeState(config: GoogleConfig, payload: GoogleStatePayload, codeVerifier: string): string {
  const body = Buffer.from(JSON.stringify({ payload, codeVerifier }), "utf8").toString("base64url");
  return `${body}.${sign(config.clientSecret, body)}`;
}

export function decodeState(
  config: GoogleConfig,
  value: string | undefined,
  now: Date,
): { payload: GoogleStatePayload; codeVerifier: string } {
  if (value === undefined) {
    throw new AppError("validation_failed", { details: { fields: [{ path: "state", rule: "missing" }] } });
  }
  const separator = value.lastIndexOf(".");
  if (separator <= 0) {
    throw new AppError("validation_failed", { details: { fields: [{ path: "state", rule: "malformed" }] } });
  }

  const body = value.slice(0, separator);
  const given = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(sign(config.clientSecret, body));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new AppError("validation_failed", { details: { fields: [{ path: "state", rule: "signature" }] } });
  }

  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    payload: GoogleStatePayload;
    codeVerifier: string;
  };
  if (parsed.payload.expiresAt <= now.getTime()) {
    throw new AppError("validation_failed", { details: { fields: [{ path: "state", rule: "expired" }] } });
  }
  return parsed;
}

export const GOOGLE_PENDING_COOKIE = "lumora_oauth_pending";

/** What PU-6 needs to finish a Google sign-up that did not confirm the age gate yet. */
export interface PendingGoogle {
  email: string;
  timezone: string;
  next: string;
  expiresAt: number;
}

export function encodePending(config: GoogleConfig, payload: PendingGoogle): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(config.clientSecret, body)}`;
}

/** `null` for anything unsigned, malformed or expired; the caller sends the user back to PU-3. */
export function decodePending(
  config: GoogleConfig,
  value: string | undefined,
  now: Date,
): PendingGoogle | null {
  if (value === undefined) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = value.slice(0, separator);
  const given = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(sign(config.clientSecret, body));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PendingGoogle;
  if (typeof parsed.email !== "string" || parsed.expiresAt <= now.getTime()) return null;
  return parsed;
}

export function createStateCookie(
  config: GoogleConfig,
  input: { next: string | null; ageConfirmed: boolean; timezone: string | null; now: Date },
): { cookieValue: string; payload: GoogleStatePayload; codeVerifier: string } {
  const codeVerifier = randomToken(32);
  const payload: GoogleStatePayload = {
    next: safeNext(input.next),
    ageConfirmed: input.ageConfirmed,
    timezone: input.timezone ?? "UTC",
    nonce: randomToken(16),
    expiresAt: input.now.getTime() + STATE_TTL_SECONDS * 1000,
  };
  return {
    cookieValue: encodeState(config, payload, codeVerifier),
    payload,
    codeVerifier,
  };
}

/** Only a same-origin relative path is accepted; anything else falls back to `/`. */
export function safeNext(next: string | null): string {
  if (next === null) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

/** PKCE S256: BASE64URL(SHA256(verifier)). */
export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier, "utf8").digest("base64url");
}

export function authorizeUrl(config: GoogleConfig, state: string, challenge: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export interface GoogleIdentity {
  subject: string;
  email: string;
  emailVerified: boolean;
}

export interface GoogleTransport {
  fetch: typeof fetch;
  now: () => Date;
}

interface Jwk {
  kid: string;
}

interface Claims {
  iss?: string;
  aud?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean;
}

async function exchangeCode(
  config: GoogleConfig,
  code: string,
  codeVerifier: string,
  transport: GoogleTransport,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });
  const response = await transport.fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new AppError("internal_error", {
      cause: new Error(`Google token exchange failed with ${response.status}`),
    });
  }
  const payload = (await response.json()) as { id_token?: string };
  if (typeof payload.id_token !== "string") {
    throw new AppError("internal_error", { cause: new Error("Google token response has no id_token") });
  }
  return payload.id_token;
}

async function publicKeyFor(kid: string, transport: GoogleTransport): Promise<KeyObject> {
  const response = await transport.fetch(JWKS_URL);
  const body = (await response.json()) as { keys?: Jwk[] };
  const jwk = body.keys?.find((candidate) => candidate.kid === kid);
  if (jwk === undefined) throw new AppError("internal_error", { cause: new Error("ID token key not found") });
  return createPublicKey({ key: jwk as JsonWebKey, format: "jwk" });
}

export async function verifyIdToken(
  config: GoogleConfig,
  idToken: string,
  transport: GoogleTransport,
): Promise<GoogleIdentity> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new AppError("internal_error", { cause: new Error("Malformed ID token") });
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as {
    alg?: string;
    kid?: string;
  };
  if (header.alg !== "RS256" || header.kid === undefined) {
    throw new AppError("internal_error", { cause: new Error("Unexpected ID token header") });
  }

  const key = await publicKeyFor(header.kid, transport);
  const valid = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`, "utf8"),
    key,
    Buffer.from(encodedSignature, "base64url"),
  );
  if (!valid) throw new AppError("internal_error", { cause: new Error("ID token signature invalid") });

  const claims = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Claims;
  const nowSeconds = Math.floor(transport.now().getTime() / 1000);
  const issuerOk = claims.iss !== undefined && (ISSUERS as readonly string[]).includes(claims.iss);
  if (!issuerOk || claims.aud !== config.clientId) {
    throw new AppError("internal_error", { cause: new Error("ID token audience or issuer mismatch") });
  }
  if (claims.exp === undefined || claims.exp <= nowSeconds) {
    throw new AppError("internal_error", { cause: new Error("ID token expired") });
  }
  if (typeof claims.sub !== "string" || typeof claims.email !== "string") {
    throw new AppError("internal_error", { cause: new Error("ID token missing subject or email") });
  }

  return {
    subject: claims.sub,
    email: claims.email.toLowerCase(),
    emailVerified: claims.email_verified === true,
  };
}

export interface GooglePorts {
  createSession: (
    userId: string,
    context: { ip: string | null; userAgent: string | null },
    now: Date,
  ) => Promise<NewSession>;
  createUser: (email: string, now: Date) => Promise<string>;
  ensureProfile: (input: { userId: string; email: string; timezone: string }) => Promise<void>;
}

export interface GoogleSignInResult {
  userId: string;
  email: string;
  session: NewSession;
  next: string;
  created: boolean;
}

/**
 * Completes the callback. A new account needs the age confirmation carried in the signed
 * state; an existing linked account signs in regardless (FR-003). A different account with
 * the same email is refused: implicit linking is off (OD-S03).
 */
export async function completeGoogleSignIn(
  database: Queryable,
  config: GoogleConfig,
  transport: GoogleTransport,
  ports: GooglePorts,
  input: { code: string; stateCookie: string | undefined; context: { ip: string | null; userAgent: string | null } },
): Promise<GoogleSignInResult> {
  const now = transport.now();
  const state = decodeState(config, input.stateCookie, now);
  const idToken = await exchangeCode(config, input.code, state.codeVerifier, transport);
  const identity = await verifyIdToken(config, idToken, transport);

  if (!identity.emailVerified) {
    throw new AppError("validation_failed", { details: { fields: [{ path: "email", rule: "unverified" }] } });
  }

  const linked = await database.query<{ user_id: string }>(
    "SELECT user_id FROM auth_accounts WHERE provider = 'google' AND provider_account_id = $1",
    [identity.subject],
  );
  let userId = linked[0]?.user_id;
  let created = false;

  if (userId === undefined) {
    const sameEmail = await database.query<{ id: string }>(
      "SELECT id FROM users WHERE lower(email) = $1",
      [identity.email],
    );
    if (sameEmail.length > 0) {
      throw new AppError("validation_failed", { details: { fields: [{ path: "email", rule: "linked_elsewhere" }] } });
    }
    if (!state.payload.ageConfirmed) {
      throw new AppError("age_confirmation_required", {
        details: { email: identity.email, timezone: state.payload.timezone, next: state.payload.next },
      });
    }

    userId = await ports.createUser(identity.email, now);
    await database.query(
      `INSERT INTO auth_accounts (id, user_id, provider, provider_account_id)
       VALUES ($1, $2, 'google', $3)`,
      [uuidv7(), userId, identity.subject],
    );
    await ports.ensureProfile({ userId, email: identity.email, timezone: state.payload.timezone });
    created = true;
  } else {
    await database.query("UPDATE users SET email_verified = true, updated_at = $2 WHERE id = $1", [
      userId,
      now.toISOString(),
    ]);
  }

  const session = await ports.createSession(userId, input.context, now);
  return { userId, email: identity.email, session, next: state.payload.next, created };
}