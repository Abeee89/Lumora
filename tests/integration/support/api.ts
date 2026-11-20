/**
 * In-process API client for integration tests: the real route handlers, the real
 * container, the real database. Nothing is stubbed except the clock of a caller that
 * asks for one.
 *
 * Every call goes through the same adapter the browser hits, so status codes, the error
 * envelope, `Retry-After` and cookies are exercised as shipped.
 */
import { z } from "zod";
import { POST as revokeOthers } from "@/app/api/app/auth/sign-ins/revoke-others/route";

import { DELETE as deleteSignIn } from "@/app/api/app/auth/sign-ins/[signInId]/route";
import { GET as getSignIns } from "@/app/api/app/auth/sign-ins/route";
import { POST as signOut } from "@/app/api/app/auth/sign-out/route";
import { POST as signIn } from "@/app/api/app/auth/sign-in/route";
import { POST as signUp } from "@/app/api/app/auth/sign-up/route";
import { POST as completeReset } from "@/app/api/app/auth/password-reset/complete/route";
import { POST as requestReset } from "@/app/api/app/auth/password-reset/request/route";
import { GET as getProfile, PATCH as patchProfile } from "@/app/api/app/profile/route";
import { PATCH as patchOnboarding } from "@/app/api/app/profile/onboarding/route";
import type { Database } from "@/kernel/db";
import { container } from "@/server/container";

/** The process-wide container the route handlers resolve; env is set in `beforeAll`. */
export function database(): Database {
  return container().database;
}

export async function userIdOf(email: string): Promise<string> {
  const row = await database().one<{ id: string }>("SELECT id FROM users WHERE lower(email) = lower($1)", [email]);
  if (row === undefined) throw new Error(`no user for ${email}`);
  return row.id;
}

export interface ApiResponse {
  status: number;
  body: unknown;
  headers: Headers;
  cookies: Record<string, string>;
}

export interface CallOptions {
  method?: string;
  body?: unknown;
  cookie?: string;
  origin?: string | null;
  headers?: Record<string, string>;
  ip?: string;
}

export const appOrigin = "http://localhost:3000";

function parseCookies(response: Response): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const raw of response.headers.getSetCookie()) {
    const pair = raw.split(";")[0] ?? "";
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    jar[pair.slice(0, separator)] = pair.slice(separator + 1);
  }
  return jar;
}

/** The session cookie name is fixed per test process (SESSION_COOKIE_SECURE=false). */
export function sessionCookie(cookies: Record<string, string>): string {
  const entry = Object.entries(cookies).find(([name]) => name.endsWith("lumora_session"));
  if (entry === undefined) throw new Error(`no session cookie in ${JSON.stringify(cookies)}`);
  return `${entry[0]}=${entry[1]}`;
}

export async function call(path: string, options: CallOptions = {}): Promise<ApiResponse> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers ?? {});
  if (options.body !== undefined) headers.set("content-type", "application/json");
  if (options.cookie !== undefined) headers.set("cookie", options.cookie);
  if (options.origin !== null) headers.set("origin", options.origin ?? appOrigin);
  headers.set("x-forwarded-for", options.ip ?? "203.0.113.10");

  const request = new Request(`${appOrigin}${path}`, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  const response = await dispatch(method, new URL(request.url).pathname, request);

  const text = await response.text();
  let body: unknown = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body, headers: response.headers, cookies: parseCookies(response) };
}

async function dispatch(method: string, path: string, request: Request): Promise<Response> {
  if (method === "POST" && path === "/api/app/auth/sign-up") return signUp(request);
  if (method === "POST" && path === "/api/app/auth/sign-in") return signIn(request);
  if (method === "POST" && path === "/api/app/auth/sign-out") return signOut(request);
  if (method === "POST" && path === "/api/app/auth/password-reset/request") return requestReset(request);
  if (method === "POST" && path === "/api/app/auth/password-reset/complete") return completeReset(request);
  if (method === "GET" && path === "/api/app/auth/sign-ins") return getSignIns(request);
  if (method === "POST" && path === "/api/app/auth/sign-ins/revoke-others") return revokeOthers(request);
  if (method === "PATCH" && path === "/api/app/profile") return patchProfile(request);
  if (method === "PATCH" && path === "/api/app/profile/onboarding") return patchOnboarding(request);
  if (method === "GET" && path === "/api/app/profile") return getProfile(request);

  const signInPath = /^\/api\/app\/auth\/sign-ins\/([^/]+)$/.exec(path);
  if (method === "DELETE" && signInPath !== null) {
    return deleteSignIn(request, { params: Promise.resolve({ signInId: signInPath[1] ?? "" }) });
  }

  throw new Error(`unrouted ${method} ${path}`);
}

/**
 * The wire shapes this suite reads. They are parsed, never cast: a response that drifts
 * from the documented envelope fails the test that touched it, with the field named.
 */
export const profileViewSchema = z
  .object({
    email: z.string(),
    displayName: z.string(),
    timezone: z.string(),
    rolloverHour: z.number(),
    theme: z.enum(["light", "dark", "system"]),
    primaryGoal: z.enum(["exam_prep", "coursework", "self_learning"]).nullable(),
    onboarding: z.object({
      completedAt: z.string().nullable(),
      dismissedAt: z.string().nullable(),
      steps: z.record(z.string(), z.string()),
    }),
    hasPassword: z.boolean(),
    googleLinked: z.boolean(),
    version: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

export const signInListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      current: z.boolean(),
      device: z.string(),
      lastActiveAt: z.string(),
      createdAt: z.string(),
    }),
  ),
});

export const errorEnvelopeSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional(),
  })
  .loose();

export type ProfileView = z.infer<typeof profileViewSchema>;
export type SignInList = z.infer<typeof signInListSchema>;

/** Parses a response body with the schema for that endpoint, naming the path on failure. */
export function parseBody<Schema extends z.ZodType>(
  schema: Schema,
  response: { body: unknown; status: number },
  path: string,
): z.infer<Schema> {
  const parsed = schema.safeParse(response.body);
  if (!parsed.success) {
    throw new Error(`${path} answered ${response.status} with an unexpected body: ${parsed.error.message}`);
  }
  return parsed.data;
}

export interface TestUser {
  email: string;
  password: string;
  userId: string;
  cookie: string;
  version: number;
}

let sequence = 0;

export function uniqueEmail(prefix: string): string {
  sequence += 1;
  return `${prefix}-${process.pid}-${sequence}@example.com`;
}

/**
 * Per-IP limits are 5 sign-ups, 5 resets and 10 sign-ins per minute (config.rateLimit).
 * Tests that are not about the limit itself get their own address so the fixed window
 * never turns an unrelated assertion into a 429. The third octet encodes the PID: without
 * it a second run inside the same minute would reuse the counters of the first.
 */
export function uniqueIp(): string {
  sequence += 1;
  return `198.18.${(process.pid % 200) + 20}.${(sequence % 200) + 1}`;
}

/** Signs a user up through AUTH-01 and returns the session the browser would hold. */
export async function signUpUser(
  options: { email?: string; password?: string; timezone?: string; ip?: string } = {},
): Promise<TestUser> {
  const email = options.email ?? uniqueEmail("owner");
  const password = options.password ?? "correct horse battery";
  const response = await call("/api/app/auth/sign-up", {
    method: "POST",
    body: { email, password, ageConfirmed: true, timezone: options.timezone ?? "UTC" },
    ip: options.ip ?? uniqueIp(),
  });
  if (response.status !== 201) {
    throw new Error(`sign-up failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  const view = parseBody(profileViewSchema, response, "/api/app/auth/sign-up");
  return {
    email,
    password,
    userId: await userIdOf(email),
    cookie: sessionCookie(response.cookies),
    version: view.version,
  };
}

export async function signInUser(user: TestUser): Promise<string> {
  const response = await call("/api/app/auth/sign-in", {
    method: "POST",
    body: { email: user.email, password: user.password },
    ip: uniqueIp(),
  });
  if (response.status !== 200) {
    throw new Error(`sign-in failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return sessionCookie(response.cookies);
}
