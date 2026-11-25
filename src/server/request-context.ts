/**
 * Request glue between a route handler and the modules: cookie parsing, the caller's
 * identity, the per-user rate limits and the audit context. Route handlers stay adapters
 * (MODULE-BOUNDARIES section 5); no module sees a `Request`.
 */
import { z } from "zod";

import { config } from "../kernel/config";
import { AppError } from "../kernel/errors";
import { clientIp, cookieHeader } from "../kernel/http";
import { isLocalDate } from "../kernel/time";
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

/**
 * M03 request bodies. Only types are asserted here: lengths, ranges and enum membership
 * belong to the module that owns the column, so every rejection carries the same
 * `details.fields` shape whether it happens here or there.
 */
export const createSubjectSchema = z.object({ name: z.string(), color: z.string() }).strict();

export const updateSubjectSchema = z
  .object({ name: z.string().optional(), color: z.string().optional() })
  .strict();

export const subjectOrderSchema = z.object({ subjectIds: z.array(z.string()).max(1000) }).strict();

const topicStatusSchema = z.enum(["not_started", "in_progress", "done"]);

export const createTopicSchema = z
  .object({ name: z.string(), weight: z.number().optional(), status: topicStatusSchema.optional() })
  .strict();

export const updateTopicSchema = z
  .object({
    name: z.string().optional(),
    weight: z.number().optional(),
    status: topicStatusSchema.optional(),
  })
  .strict();

export const topicOrderSchema = z.object({ topicIds: z.array(z.string()).max(2000) }).strict();

export const bulkTopicsSchema = z
  .object({ lines: z.array(z.string()).max(5000), dryRun: z.boolean().optional() })
  .strict();

/**
 * M04 request bodies. EXAM-01..EXAM-06: the module owns bounds and enum membership,
 * the adapter only asserts the shape.
 */
export const createExamSchema = z
  .object({ subjectId: z.string(), title: z.string(), examDate: z.string() })
  .strict();

export const updateExamSchema = z
  .object({
    subjectId: z.string().optional(),
    title: z.string().optional(),
    examDate: z.string().optional(),
  })
  .strict();

export const examListQuery = z
  .object({
    state: z.enum(["upcoming", "archived"]).default("upcoming"),
    limit: z.coerce.number().int().optional(),
    cursor: z.string().optional(),
  })
  .strict()
  .superRefine((query, ctx) => {
    // EXAM-01: the archived list is the only paginated surface, so a page size or
    // cursor on the upcoming list is a programming error, not a silent ignore.
    if (query.state === "upcoming" && (query.limit !== undefined || query.cursor !== undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "limit and cursor apply to archived exams only" });
    }
  });

export const setExamTopicsSchema = z.object({ topicIds: z.array(z.string()) }).strict();

/** EXAM-06: `completed` is required; a missing boolean is a 400, not a toggle. */
export const setExamTopicSchema = z.object({ completed: z.boolean() }).strict();

/**
 * M05 request bodies. PLAN-01..PLAN-06: the module owns the duration bounds, the date
 * range and the future/past rules; the adapter asserts the shape and the warning codes
 * (API-SCHEMAS section 8: an unknown code is a 400, never a silent ignore).
 */
const confirmedWarnings = z.array(z.enum(["overlap", "exam_date"])).optional();

export const createPlanEntrySchema = z
  .object({
    subjectId: z.string(),
    topicId: z.string().nullable().optional(),
    startsAt: z.string(),
    durationMin: z.number().int(),
    confirmedWarnings,
  })
  .strict();

export const updatePlanEntrySchema = z
  .object({
    subjectId: z.string().optional(),
    topicId: z.string().nullable().optional(),
    startsAt: z.string().optional(),
    durationMin: z.number().int().optional(),
    confirmedWarnings,
  })
  .strict();

export const planEntryListQuery = z
  .object({
    from: z.string(),
    to: z.string(),
    subjectId: z.string().optional(),
    status: z.enum(["upcoming", "done", "missed"]).optional(),
  })
  .strict();

/**
 * M06 request bodies. SESS-01..SESS-05: the module owns the duration bounds, the day
 * range and the future/past rules; the adapter asserts the shape (API-SCHEMAS section 9).
 */
export const createSessionSchema = z
  .object({
    subjectId: z.string(),
    topicId: z.string().nullable().optional(),
    planEntryId: z.string().nullable().optional(),
    startedAt: z.string(),
    endedAt: z.string(),
  })
  .strict();

export const updateSessionSchema = z
  .object({
    subjectId: z.string().optional(),
    topicId: z.string().nullable().optional(),
    planEntryId: z.string().nullable().optional(),
    startedAt: z.string().optional(),
    endedAt: z.string().optional(),
  })
  .strict();

export const sessionListQuery = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    subjectId: z.string().optional(),
    topicId: z.string().optional(),
    source: z.enum(["timer", "manual"]).optional(),
    limit: z.coerce.number().int().optional(),
    cursor: z.string().optional(),
  })
  .strict();

/**
 * M07 request bodies. TIM-02 and TIM-08: the module owns the duration ranges and the
 * single-timer rule; the adapter asserts the shape (API-SCHEMAS section 10).
 */
export const startTimerSchema = z
  .object({
    mode: z.enum(["stopwatch", "pomodoro"]),
    subjectId: z.string(),
    topicId: z.string().nullable().optional(),
    planEntryId: z.string().nullable().optional(),
    replaceRunning: z.boolean().optional(),
  })
  .strict();

export const updateTimerSettingsSchema = z
  .object({
    focusMin: z.number().int().optional(),
    breakMin: z.number().int().optional(),
    longBreakMin: z.number().int().optional(),
    cyclesBeforeLongBreak: z.number().int().optional(),
    audioLoop: z.enum(["none", "rain", "white_noise", "cafe"]).optional(),
    audioVolume: z.number().int().optional(),
  })
  .strict();

/**
 * M08 request bodies and query. GOAL-02..GOAL-04: the module owns the 5..1440 minute range
 * (BR-013, EC-023) while the adapter asserts the shape (API-SCHEMAS section 14); a string
 * target is a 400 rather than a coercion, because a form sends a number.
 */
export const setDailyGoalSchema = z.object({ targetMinutes: z.number() }).strict();

export const setSubjectGoalSchema = z.object({ targetMinutes: z.number() }).strict();

/** GOAL-05: `date` is a local calendar date; a missing one means today in the profile zone. */
export const goalProgressQuery = z
  .object({ date: z.string().refine(isLocalDate, { message: "not a local date" }).optional() })
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
 * ADR-011, API-CONVENTIONS section 6: `If-Match: "<version>"`; a bare integer is accepted
 * too. `null` when the header is absent or unreadable, which the caller answers with
 * `version_required`.
 */
export function ifMatchVersion(request: Request): number | null {
  const header = request.headers.get("if-match");
  if (header === null) return null;
  const parsed = Number.parseInt(header.replace(/"/g, "").trim(), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

/** API-CONVENTIONS section 7: 1..100 characters of `[A-Za-z0-9_-]`, scoped to the user. */
function readIdempotencyKey(request: Request): string | null {
  const header = request.headers.get("idempotency-key");
  if (header === null || header.trim() === "") return null;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(header)) {
    throw new AppError("validation_failed", {
      details: { fields: [{ path: "Idempotency-Key", rule: "format" }] },
    });
  }
  return header;
}

/** Every creating `POST` on the internal API requires a key. */
export function requiredIdempotencyKey(request: Request): string {
  const key = readIdempotencyKey(request);
  if (key === null) throw new AppError("idempotency_key_required");
  return key;
}

/** `includeArchived` is a boolean query parameter; anything else is `validation_failed`. */
export function includeArchivedQuery(url: URL): boolean {
  const raw = url.searchParams.get("includeArchived");
  if (raw === null) return false;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new AppError("validation_failed", {
    details: { fields: [{ path: "includeArchived", rule: "boolean" }] },
  });
}

/**
 * NFR-022. Reads fail open: a limiter outage must not take the whole app down, and the
 * endpoints that must never fail open (register, sign-in, password reset) call the limiter
 * directly instead of through this guard.
 */
export async function enforceUserRate(
  c: Container,
  identity: auth.SessionIdentity,
  kind: "read" | "write" | "heavy" | "timer",
): Promise<void> {
  const limit = {
    read: config.rateLimit.readPerUserPerMinute,
    write: config.rateLimit.writePerUserPerMinute,
    heavy: config.rateLimit.heavyPerUserPerMinute,
    timer: config.rateLimit.timerPerUserPerMinute,
  }[kind];
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