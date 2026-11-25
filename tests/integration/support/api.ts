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
import { POST as bulkTopics } from "@/app/api/app/subjects/[subjectId]/topics/bulk/route";
import { PUT as reorderTopics } from "@/app/api/app/subjects/[subjectId]/topics/order/route";
import { GET as getTopics, POST as createTopic } from "@/app/api/app/subjects/[subjectId]/topics/route";
import { POST as archiveSubject } from "@/app/api/app/subjects/[subjectId]/archive/route";
import { POST as restoreSubject } from "@/app/api/app/subjects/[subjectId]/restore/route";
import { GET as getSubject, PATCH as patchSubject } from "@/app/api/app/subjects/[subjectId]/route";
import { PUT as reorderSubjects } from "@/app/api/app/subjects/order/route";
import { GET as getSubjects, POST as createSubject } from "@/app/api/app/subjects/route";
import { POST as archiveTopic } from "@/app/api/app/topics/[topicId]/archive/route";
import { POST as restoreTopic } from "@/app/api/app/topics/[topicId]/restore/route";
import { GET as getTopic, PATCH as patchTopic } from "@/app/api/app/topics/[topicId]/route";
import { GET as getExams, POST as createExam } from "@/app/api/app/exams/route";
import { GET as getExam, PATCH as patchExam } from "@/app/api/app/exams/[examId]/route";
import { PUT as setExamTopics } from "@/app/api/app/exams/[examId]/topics/route";
import { PUT as setExamTopic } from "@/app/api/app/exams/[examId]/topics/[topicId]/route";
import { GET as getPlanEntries, POST as createPlanEntry } from "@/app/api/app/plan-entries/route";
import {
  DELETE as deletePlanEntry,
  GET as getPlanEntry,
  PATCH as patchPlanEntry,
} from "@/app/api/app/plan-entries/[entryId]/route";
import { POST as markPlanEntryMissed } from "@/app/api/app/plan-entries/[entryId]/missed/route";
import { GET as getSessions, POST as createSession } from "@/app/api/app/sessions/route";
import {
  DELETE as deleteSession,
  GET as getSession,
  PATCH as patchSession,
} from "@/app/api/app/sessions/[sessionId]/route";
import { GET as getTimer } from "@/app/api/app/timer/route";
import { POST as startTimer } from "@/app/api/app/timer/start/route";
import { POST as pauseTimer } from "@/app/api/app/timer/pause/route";
import { POST as resumeTimer } from "@/app/api/app/timer/resume/route";
import { POST as stopTimer } from "@/app/api/app/timer/stop/route";
import { POST as heartbeatTimer } from "@/app/api/app/timer/heartbeat/route";
import { GET as getTimerSettings, PATCH as patchTimerSettings } from "@/app/api/app/timer/settings/route";
import { GET as getGoals } from "@/app/api/app/goals/route";
import { PUT as putDailyGoal } from "@/app/api/app/goals/daily/route";
import { GET as getGoalProgress } from "@/app/api/app/goals/progress/route";
import {
  DELETE as deleteSubjectGoal,
  PUT as putSubjectGoal,
} from "@/app/api/app/goals/subjects/[subjectId]/route";
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
  if (method === "GET" && path === "/api/app/subjects") return getSubjects(request);
  if (method === "POST" && path === "/api/app/subjects") return createSubject(request);
  if (method === "PUT" && path === "/api/app/subjects/order") return reorderSubjects(request);

  const subjectPath = /^\/api\/app\/subjects\/([^/]+)$/.exec(path);
  if (subjectPath !== null) {
    const params = { params: Promise.resolve({ subjectId: subjectPath[1] ?? "" }) };
    if (method === "GET") return getSubject(request, params);
    if (method === "PATCH") return patchSubject(request, params);
  }

  const subjectActionPath = /^\/api\/app\/subjects\/([^/]+)\/(archive|restore)$/.exec(path);
  if (method === "POST" && subjectActionPath !== null) {
    const params = { params: Promise.resolve({ subjectId: subjectActionPath[1] ?? "" }) };
    return subjectActionPath[2] === "archive"
      ? archiveSubject(request, params)
      : restoreSubject(request, params);
  }

  const subjectTopicsPath = /^\/api\/app\/subjects\/([^/]+)\/topics$/.exec(path);
  if (subjectTopicsPath !== null) {
    const params = { params: Promise.resolve({ subjectId: subjectTopicsPath[1] ?? "" }) };
    if (method === "GET") return getTopics(request, params);
    if (method === "POST") return createTopic(request, params);
  }

  const topicsOrderPath = /^\/api\/app\/subjects\/([^/]+)\/topics\/order$/.exec(path);
  if (method === "PUT" && topicsOrderPath !== null) {
    return reorderTopics(request, { params: Promise.resolve({ subjectId: topicsOrderPath[1] ?? "" }) });
  }

  const topicsBulkPath = /^\/api\/app\/subjects\/([^/]+)\/topics\/bulk$/.exec(path);
  if (method === "POST" && topicsBulkPath !== null) {
    return bulkTopics(request, { params: Promise.resolve({ subjectId: topicsBulkPath[1] ?? "" }) });
  }

  const topicPath = /^\/api\/app\/topics\/([^/]+)$/.exec(path);
  if (topicPath !== null) {
    const params = { params: Promise.resolve({ topicId: topicPath[1] ?? "" }) };
    if (method === "GET") return getTopic(request, params);
    if (method === "PATCH") return patchTopic(request, params);
  }

  const topicActionPath = /^\/api\/app\/topics\/([^/]+)\/(archive|restore)$/.exec(path);
  if (method === "POST" && topicActionPath !== null) {
    const params = { params: Promise.resolve({ topicId: topicActionPath[1] ?? "" }) };
    return topicActionPath[2] === "archive"
      ? archiveTopic(request, params)
      : restoreTopic(request, params);
  }

  const examsPath = /^\/api\/app\/exams$/.exec(path);
  if (examsPath !== null) {
    if (method === "GET") return getExams(request);
    if (method === "POST") return createExam(request);
  }

  const examPath = /^\/api\/app\/exams\/([^/]+)$/.exec(path);
  if (examPath !== null) {
    const params = { params: Promise.resolve({ examId: examPath[1] ?? "" }) };
    if (method === "GET") return getExam(request, params);
    if (method === "PATCH") return patchExam(request, params);
  }

  const examTopicsPath = /^\/api\/app\/exams\/([^/]+)\/topics$/.exec(path);
  if (method === "PUT" && examTopicsPath !== null) {
    return setExamTopics(request, { params: Promise.resolve({ examId: examTopicsPath[1] ?? "" }) });
  }

  const examTopicPath = /^\/api\/app\/exams\/([^/]+)\/topics\/([^/]+)$/.exec(path);
  if (method === "PUT" && examTopicPath !== null) {
    return setExamTopic(request, {
      params: Promise.resolve({ examId: examTopicPath[1] ?? "", topicId: examTopicPath[2] ?? "" }),
    });
  }
  const planEntriesPath = /^\/api\/app\/plan-entries$/.exec(path);
  if (planEntriesPath !== null) {
    if (method === "GET") return getPlanEntries(request);
    if (method === "POST") return createPlanEntry(request);
  }

  const planEntryPath = /^\/api\/app\/plan-entries\/([^/]+)$/.exec(path);
  if (planEntryPath !== null) {
    const params = { params: Promise.resolve({ entryId: planEntryPath[1] ?? "" }) };
    if (method === "GET") return getPlanEntry(request, params);
    if (method === "PATCH") return patchPlanEntry(request, params);
    if (method === "DELETE") return deletePlanEntry(request, params);
  }

  const planMissedPath = /^\/api\/app\/plan-entries\/([^/]+)\/missed$/.exec(path);
  if (method === "POST" && planMissedPath !== null) {
    return markPlanEntryMissed(request, {
      params: Promise.resolve({ entryId: planMissedPath[1] ?? "" }),
    });
  }
  const sessionsPath = /^\/api\/app\/sessions$/.exec(path);
  if (sessionsPath !== null) {
    if (method === "GET") return getSessions(request);
    if (method === "POST") return createSession(request);
  }

  const sessionPath = /^\/api\/app\/sessions\/([^/]+)$/.exec(path);
  if (sessionPath !== null) {
    const params = { params: Promise.resolve({ sessionId: sessionPath[1] ?? "" }) };
    if (method === "GET") return getSession(request, params);
    if (method === "PATCH") return patchSession(request, params);
    if (method === "DELETE") return deleteSession(request, params);
  }

  const timerPath = /^\/api\/app\/timer$/.exec(path);
  if (method === "GET" && timerPath !== null) return getTimer(request);

  const timerActionPath = /^\/api\/app\/timer\/(start|pause|resume|stop|heartbeat)$/.exec(path);
  if (method === "POST" && timerActionPath !== null) {
    const action = timerActionPath[1] ?? "";
    if (action === "start") return startTimer(request);
    if (action === "pause") return pauseTimer(request);
    if (action === "resume") return resumeTimer(request);
    if (action === "stop") return stopTimer(request);
    return heartbeatTimer(request);
  }

  const timerSettingsPath = /^\/api\/app\/timer\/settings$/.exec(path);
  if (timerSettingsPath !== null) {
    if (method === "GET") return getTimerSettings(request);
    if (method === "PATCH") return patchTimerSettings(request);
  }

  const goalsPath = /^\/api\/app\/goals$/.exec(path);
  if (method === "GET" && goalsPath !== null) return getGoals(request);

  const dailyGoalPath = /^\/api\/app\/goals\/daily$/.exec(path);
  if (method === "PUT" && dailyGoalPath !== null) return putDailyGoal(request);

  const goalProgressPath = /^\/api\/app\/goals\/progress$/.exec(path);
  if (method === "GET" && goalProgressPath !== null) return getGoalProgress(request);

  const subjectGoalPath = /^\/api\/app\/goals\/subjects\/([^/]+)$/.exec(path);
  if (subjectGoalPath !== null) {
    const params = { params: Promise.resolve({ subjectId: subjectGoalPath[1] ?? "" }) };
    if (method === "PUT") return putSubjectGoal(request, params);
    if (method === "DELETE") return deleteSubjectGoal(request, params);
  }

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

export const subjectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    position: z.number(),
    archivedAt: z.string().nullable(),
    version: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

/** A-7 reads the two counts from the list response only (deviation recorded in M03). */
export const subjectListItemSchema = subjectSchema.extend({
  topicCount: z.number(),
  doneTopicCount: z.number(),
});

export const subjectListSchema = z.object({ data: z.array(subjectListItemSchema) });

/** SUBJ-05 and TOP-06 answer the reordered rows without the counts SUBJ-01 adds. */
export const subjectCollectionSchema = z.object({ data: z.array(subjectSchema) });

export const topicSchema = z
  .object({
    id: z.string(),
    subjectId: z.string(),
    name: z.string(),
    weight: z.number(),
    status: z.enum(["not_started", "in_progress", "done"]),
    position: z.number(),
    archivedAt: z.string().nullable(),
    version: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

export const topicListSchema = z.object({ data: z.array(topicSchema) });

const examCountdownSchema = z
  .object({ daysRemaining: z.number().int(), isToday: z.boolean() })
  .loose();

const examChecklistItemSchema = z
  .object({
    topicId: z.string(),
    name: z.string(),
    completed: z.boolean(),
    weight: z.number().int(),
  })
  .loose();

export const examSchema = z
  .object({
    id: z.string(),
    subjectId: z.string(),
    title: z.string(),
    examDate: z.string(),
    state: z.enum(["upcoming", "archived"]),
    countdown: examCountdownSchema.nullable(),
    checklist: z.array(examChecklistItemSchema),
    version: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

export const examListItemSchema = examSchema
  .omit({ checklist: true })
  .extend({ topicCount: z.number(), completedCount: z.number() });

export const examListSchema = z.object({
  data: z.array(examListItemSchema),
  page: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }),
});

export type ExamWire = z.infer<typeof examSchema>;
export type ExamListWire = z.infer<typeof examListSchema>;

/** API-SCHEMAS section 8. Strict: a field the spec does not list fails the test. */
export const planEntrySchema = z
  .object({
    id: z.string(),
    subjectId: z.string(),
    topicId: z.string().nullable(),
    startsAt: z.string(),
    durationMin: z.number(),
    timezone: z.string(),
    localDate: z.string(),
    status: z.enum(["upcoming", "done", "missed"]),
    missedAt: z.string().nullable(),
    plannedMin: z.number(),
    actualSeconds: z.number(),
    varianceSeconds: z.number(),
    version: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const planWarningSchema = z.union([
  z
    .object({
      code: z.literal("overlap"),
      planEntryId: z.string(),
      subjectId: z.string(),
      startsAt: z.string(),
      durationMin: z.number(),
    })
    .strict(),
  z.object({ code: z.literal("exam_date"), examId: z.string(), examDate: z.string() }).strict(),
]);

export const dayAllocationSchema = z
  .object({
    localDate: z.string(),
    seconds: z.number().int().min(1).max(86400),
    isManual: z.boolean(),
  })
  .strict();

/** API-SCHEMAS section 9. Strict: a field the spec does not list fails the test. */
export const sessionSchema = z
  .object({
    id: z.string(),
    subjectId: z.string(),
    topicId: z.string().nullable(),
    planEntryId: z.string().nullable(),
    source: z.enum(["timer", "manual"]),
    mode: z.enum(["stopwatch", "pomodoro"]).nullable(),
    startedAt: z.string(),
    endedAt: z.string(),
    durationSeconds: z.number().int().min(60).max(86400),
    pomodorosCompleted: z.number().int().min(0),
    autoClosed: z.boolean(),
    timezone: z.string(),
    localDate: z.string(),
    dayAllocations: z.array(dayAllocationSchema),
    serverTime: z.string().optional(),
    version: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const sessionListSchema = z.object({
  data: z.array(sessionSchema),
  page: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }),
});

export type SessionWire = z.infer<typeof sessionSchema>;
export type SessionListWire = z.infer<typeof sessionListSchema>;

/**
 * API-SCHEMAS section 10. Strict: a field the spec does not list fails the test.
 * `segments.focusSeconds` is the measured study time (BR-012) and is what FR-021 and
 * AC-FR-052-2 read for an elapsed value the documented pair cannot express when paused;
 * the addition is recorded in M07-EVIDENCE.
 */
export const timerSegmentsSummarySchema = z
  .object({
    count: z.number().int().min(0),
    openSegmentStartedAt: z.string().nullable(),
    focusSeconds: z.number().int().min(0),
  })
  .strict();

export const timerStateSchema = z
  .object({
    id: z.string(),
    state: z.enum(["running", "paused"]),
    mode: z.enum(["stopwatch", "pomodoro"]),
    subjectId: z.string(),
    topicId: z.string().nullable(),
    planEntryId: z.string().nullable(),
    phase: z.enum(["focus", "break", "long_break"]).nullable(),
    phaseEndsAt: z.string().nullable(),
    cycleIndex: z.number().int().min(1),
    pomodorosCompleted: z.number().int().min(0),
    focusMin: z.number().int(),
    breakMin: z.number().int(),
    longBreakMin: z.number().int(),
    cyclesBeforeLongBreak: z.number().int(),
    startedAt: z.string(),
    segments: timerSegmentsSummarySchema,
    lastHeartbeatAt: z.string(),
    serverTime: z.string(),
    version: z.number().int().min(1),
  })
  .strict();

/** TIM-01 wraps the state with the clock the client computes elapsed time from. */
export const timerStateResponseSchema = z
  .object({ timer: timerStateSchema.nullable(), serverTime: z.string() })
  .strict();

export const stopTimerResultSchema = z
  .object({
    outcome: z.enum(["saved", "time_only", "discarded"]),
    session: sessionSchema.optional(),
    message: z.string(),
  })
  .strict();

export const timerSettingsSchema = z
  .object({
    focusMin: z.number().int(),
    breakMin: z.number().int(),
    longBreakMin: z.number().int(),
    cyclesBeforeLongBreak: z.number().int(),
    audioLoop: z.enum(["none", "rain", "white_noise", "cafe"]),
    audioVolume: z.number().int(),
    version: z.number().int().min(0),
    updatedAt: z.string().nullable(),
  })
  .strict();

export type TimerWire = z.infer<typeof timerStateSchema>;
export type StopTimerWire = z.infer<typeof stopTimerResultSchema>;
export type TimerSettingsWire = z.infer<typeof timerSettingsSchema>;

/**
 * API-SCHEMAS section 14. Strict: a field the spec does not list fails the test.
 * `SubjectGoal.subjectArchived` is the flag GOAL-01 promises for an archived subject's
 * suspended goal (API-ENDPOINTS GOAL-01, AC-FR-071-4); the schema table omits it.
 */
export const dailyGoalSchema = z
  .object({ targetMinutes: z.number().int().min(5).max(1440), effectiveFrom: z.string() })
  .strict();

export const subjectGoalSchema = z
  .object({
    subjectId: z.string(),
    targetMinutes: z.number().int().min(5).max(1440),
    subjectArchived: z.boolean(),
  })
  .strict();

export const goalSetSchema = z
  .object({ daily: dailyGoalSchema, subjects: z.array(subjectGoalSchema) })
  .strict();

export const subjectGoalProgressSchema = z
  .object({
    subjectId: z.string(),
    minutes: z.number().int().min(0),
    targetMinutes: z.number().int().min(5).max(1440),
    percent: z.number().int().min(0),
    goalMet: z.boolean(),
  })
  .strict();

export const goalProgressSchema = z
  .object({
    date: z.string(),
    minutes: z.number().int().min(0),
    targetMinutes: z.number().int().min(5).max(1440),
    percent: z.number().int().min(0),
    goalMet: z.boolean(),
    subjects: z.array(subjectGoalProgressSchema),
  })
  .strict();

export type GoalSetWire = z.infer<typeof goalSetSchema>;
export type GoalProgressWire = z.infer<typeof goalProgressSchema>;

/** Create and update answer the entry with the advisories the caller confirmed. */
export const planEntryWrittenSchema = planEntrySchema.extend({
  warnings: z.array(planWarningSchema),
});

export const planEntryListSchema = z.object({ data: z.array(planEntrySchema) });

export type PlanEntryWire = z.infer<typeof planEntrySchema>;
export type PlanWarningWire = z.infer<typeof planWarningSchema>;

export const bulkPreviewSchema = z.object({
  valid: z.array(z.string()),
  duplicates: z.array(z.string()),
  tooLong: z.array(z.string()),
});

export type SubjectWire = z.infer<typeof subjectSchema>;
export type TopicWire = z.infer<typeof topicSchema>;

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
