/**
 * ERROR-HANDLING.md sections 2 to 4: one internal envelope, one code catalogue.
 * Domain code throws `AppError`; adapters map it with `toEnvelope`.
 */

export const errorCategories = [
  "validation",
  "authentication",
  "authorization",
  "conflict",
  "rate_limit",
  "dependency",
  "unexpected",
] as const;

export type ErrorCategory = (typeof errorCategories)[number];

type CodeEntry = {
  category: ErrorCategory;
  status: number;
  retryable: boolean;
  message: string;
};

const entry = (
  category: ErrorCategory,
  status: number,
  retryable: boolean,
  message: string,
): CodeEntry => ({ category, status, retryable, message });

/**
 * Names are stable once released (ERROR-HANDLING section 4). Adding a code is a
 * spec change; this table must stay in step with that document.
 */
export const errorCatalog = {
  validation_failed: entry("validation", 400, false, "The request could not be validated."),
  password_too_short: entry("validation", 400, false, "The password is too short."),
  age_confirmation_required: entry("validation", 400, false, "Age confirmation is required."),
  invalid_timezone: entry("validation", 400, false, "The time zone is not recognised."),
  goal_out_of_range: entry("validation", 400, false, "The goal is outside the allowed range."),
  duration_out_of_range: entry("validation", 400, false, "The duration is outside the allowed range."),
  manual_entry_in_future: entry("validation", 400, false, "A manual entry cannot be in the future."),
  manual_entry_too_long: entry("validation", 400, false, "A manual entry is too long."),
  daily_total_exceeded: entry("validation", 400, false, "The daily total would be exceeded."),
  exam_date_in_past: entry("validation", 400, false, "The exam date is in the past."),
  consent_required: entry("validation", 400, false, "Consent is required."),
  input_too_large: entry("validation", 400, false, "The input is too large."),
  version_required: entry("validation", 400, false, "The version header is required."),
  idempotency_key_required: entry("validation", 400, false, "The Idempotency-Key header is required."),

  unauthenticated: entry("authentication", 401, false, "Sign in to continue."),
  invalid_credentials: entry("authentication", 401, false, "The email or password is incorrect."),
  account_locked: entry("authentication", 401, true, "The account is temporarily locked."),
  session_expired: entry("authentication", 401, false, "The session has expired."),
  session_revoked: entry("authentication", 401, false, "The session was revoked."),
  reset_token_invalid: entry("authentication", 401, false, "The reset link is invalid or expired."),
  api_key_invalid: entry("authentication", 401, false, "The API key is invalid."),
  api_key_revoked: entry("authentication", 401, false, "The API key was revoked."),

  not_found: entry("authorization", 404, false, "Not found."),
  csrf_rejected: entry("authorization", 403, false, "The request origin was rejected."),
  scope_missing: entry("authorization", 403, false, "The API key lacks this scope."),
  role_not_allowed: entry("authorization", 403, false, "This role cannot perform the action."),
  last_administrator: entry("conflict", 409, false, "The last administrator cannot be removed."),

  stale_version: entry("conflict", 409, false, "The record changed elsewhere."),
  name_conflict: entry("conflict", 409, false, "A subject with that name already exists."),
  subject_archived: entry("conflict", 409, false, "This subject is archived. Restore it first."),
  idempotency_key_reused: entry("conflict", 409, false, "That Idempotency-Key was used for a different request."),
  request_in_progress: entry("conflict", 409, true, "An identical request is still running."),
  timer_already_running: entry("conflict", 409, false, "A timer is already running."),
  subject_has_running_session: entry("conflict", 409, false, "A running session blocks this archive."),
  overlap_confirmation_required: entry("conflict", 409, false, "Overlapping plan entries need confirmation."),
  exam_date_warning_confirmation_required: entry("conflict", 409, false, "The entry is after the exam date."),
  manual_entry_overlaps_session: entry("conflict", 409, false, "The entry overlaps a recorded session."),
  duplicate_email: entry("conflict", 409, false, "That email is already registered."),
  group_full: entry("conflict", 409, false, "The group is full."),
  invite_expired: entry("conflict", 409, false, "The invite expired."),
  already_member: entry("conflict", 409, false, "Already a member."),
  past_entry_read_only: entry("conflict", 409, false, "Past plan entries are read-only."),
  session_already_closed: entry("conflict", 409, false, "The session is already closed."),

  rate_limited: entry("rate_limit", 429, true, "Too many requests."),
  ai_daily_limit_reached: entry("rate_limit", 429, false, "The daily AI limit was reached."),
  export_limit_reached: entry("rate_limit", 429, true, "An export is already running."),

  ai_provider_unavailable: entry("dependency", 503, true, "The AI provider is unavailable."),
  ai_provider_timeout: entry("dependency", 504, true, "The AI provider timed out."),
  ai_no_valid_entries: entry("dependency", 502, false, "The AI provider returned no usable entries."),
  email_delivery_failed: entry("dependency", 503, true, "The email could not be delivered."),
  storage_unavailable: entry("dependency", 503, true, "Storage is unavailable."),
  database_unavailable: entry("dependency", 503, true, "The database is unavailable."),

  internal_error: entry("unexpected", 500, false, "Something went wrong."),
} as const satisfies Record<string, CodeEntry>;

export type ErrorCode = keyof typeof errorCatalog;

export interface ErrorEnvelope {
  code: ErrorCode;
  category: ErrorCategory;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
  retryable: boolean;
  retryAfter?: number;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;
  readonly retryAfter?: number;

  constructor(
    code: ErrorCode,
    options: { details?: Record<string, unknown>; retryAfter?: number; cause?: unknown } = {},
  ) {
    super(errorCatalog[code].message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    if (options.details !== undefined) this.details = options.details;
    if (options.retryAfter !== undefined) this.retryAfter = options.retryAfter;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function statusOf(code: ErrorCode): number {
  return errorCatalog[code].status;
}

export function envelopeOf(error: unknown, requestId: string): ErrorEnvelope {
  if (isAppError(error)) {
    const meta = errorCatalog[error.code];
    const envelope: ErrorEnvelope = {
      code: error.code,
      category: meta.category,
      message: meta.message,
      requestId,
      retryable: meta.retryable,
    };
    if (error.details !== undefined) envelope.details = error.details;
    if (error.retryAfter !== undefined) envelope.retryAfter = error.retryAfter;
    return envelope;
  }
  return {
    code: "internal_error",
    category: "unexpected",
    message: errorCatalog.internal_error.message,
    requestId,
    retryable: false,
  };
}

/** Status for any thrown value, including unclassified bugs. */
export function statusFor(error: unknown): number {
  return isAppError(error) ? statusOf(error.code) : 500;
}