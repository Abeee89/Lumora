/**
 * Request glue between a route handler and the modules: cookie parsing, the caller's
 * identity, the per-user rate limits and the audit context. Route handlers stay adapters
 * (MODULE-BOUNDARIES section 5); no module sees a `Request`.
 */
import { z } from "zod";

import { config } from "../kernel/config";
import { AppError } from "../kernel/errors";
import { clientIp, cookieHeader } from "../kernel/http";
import * as auth from "../modules/auth/public";
import { container, sessionCookieName, type Container } from "./container";

export const signUpSchema = z
  .object({
    email: z.string().trim().min(3).max(config.auth.emailMaxLength).email(),
    password: z.string().min(1),
    ageConfirmed: z.boolean(),
    timezone: z.string().min(1),
  })
  .strict();

export const signInSchema = z
  .object({
    email: z.string().trim().min(1).max(config.auth.emailMaxLength),
    password: z.string().min(1),
  })
  .strict();

export const passwordResetRequestSchema = z
  .object({ email: z.string().trim().min(1).max(config.auth.emailMaxLength) })
  .strict();

export const passwordResetCompleteSchema = z
  .object({ token: z.string().min(1), newPassword: z.string().min(1) })
  .strict();

export const updateProfileSchema = z
  .object({
    displayName: z.string().optional(),
    timezone: z.string().optional(),
    rolloverHour: z.number().int().optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    primaryGoal: z.enum(["exam_prep", "coursework", "self_learning"]).nullable().optional(),
  })
  .strict();

export const updateOnboardingSchema = z
  .object({
    action: z.enum(["complete_step", "complete", "dismiss", "reopen"]),
    step: z.enum(["primary_goal", "first_subject", "daily_goal_timezone", "first_session"]).optional(),
  })
  .strict();

export const sessionMaxAgeSeconds = config.auth.sessionLifetimeDays * 24 * 60 * 60;

export function defaultContainer(): Container {
  return container();
}

export function requestContext(request: Request, c: Container): auth.RequestContext {
  return {
    ip: clientIp(request, c.trustedProxyHops),
    userAgent: request.headers.get("user-agent"),
  };
}

export function sessionCookie(request: Request, c: Container): string | undefined {
  const header = request.headers.get("cookie");
  if (header === null) return undefined;
  const name = sessionCookieName(c.secureCookies);
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return undefined;
}

export function sessionCookieFor(c: Container, rawToken: string, maxAgeSeconds: number): string {
  return cookieHeader(sessionCookieName(c.secureCookies), rawToken, {
    secure: c.secureCookies,
    maxAgeSeconds,
  });
}

export function clearedSessionCookie(c: Container): string {
  return cookieHeader(sessionCookieName(c.secureCookies), "", {
    secure: c.secureCookies,
    maxAgeSeconds: 0,
    expires: new Date(0),
  });
}

export async function requireIdentity(request: Request, c: Container): Promise<auth.SessionIdentity> {
  return auth.currentIdentity(c.database, c.authDeps, sessionCookie(request, c));
}

/**
 * NFR-022. Reads fail open: a limiter outage must not take the whole app down, and the
 * endpoints that must never fail open (register, sign-in, password reset) call the limiter
 * directly instead of through this guard.
 */
export async function enforceUserRate(
  c: Container,
  identity: auth.SessionIdentity,
  kind: "read" | "write",
): Promise<void> {
  const limit =
    kind === "read" ? config.rateLimit.readPerUserPerMinute : config.rateLimit.writePerUserPerMinute;
  try {
    const result = await c.authDeps.limiter.consume(
      `user:${identity.userId}:${kind}`,
      limit,
      config.rateLimit.windowSeconds,
    );
    if (!result.allowed) throw new AppError("rate_limited", { retryAfter: result.resetSeconds });
  } catch (error) {
    if (error instanceof AppError) throw error;
  }
}