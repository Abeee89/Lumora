/**
 * User-facing text for a failure, keyed by the stable error code (ERROR-HANDLING section 4
 * fixes the names, not the messages). Every sentence says what happened and what to do.
 */
export const errorCopy: Readonly<Record<string, string>> = {
  validation_failed: "Check the highlighted fields and try again.",
  password_too_short: "Use at least 10 characters.",
  age_confirmation_required: "Confirm that you are 16 or older to continue.",
  invalid_timezone: "Choose a time zone from the list.",
  not_found: "We could not find that page.",
  unauthenticated: "Sign in to continue.",
  invalid_credentials: "Email or password is not correct.",
  account_locked: "Too many attempts. Try again in a few minutes.",
  session_expired: "Your session ended. Log in to continue.",
  session_revoked: "Your session ended. Log in to continue.",
  reset_token_invalid: "This reset link is invalid or has expired.",
  duplicate_email: "An account already exists for that email. Log in instead.",
  stale_version: "This changed in another tab or device.",
  version_required: "Reload the page and save again.",
  rate_limited: "Too many requests. Wait a moment and try again.",
  email_delivery_failed: "The email could not be sent. Try again.",
  database_unavailable: "The service is unavailable right now. Try again in a moment.",
  internal_error: "Something went wrong on our side. Try again.",
  csrf_rejected: "Reload the page and try again.",
  network_error: "We could not reach the server. Check your connection and try again.",
  name_conflict: "An active subject already uses that name. Choose another one.",
  subject_archived: "This subject is archived. Restore it first.",
  subject_has_running_session: "A session is running on this subject. Stop the timer first.",
  input_too_large: "That is more than the limit for one paste.",
  exam_date_in_past: "Choose an exam date that is today or later.",
  invalid_page_size: "That page size is outside the allowed range.",
  invalid_cursor: "That page link is out of date. Refresh the list.",
  invalid_date_range: "Choose a range of 93 days or less, ending on or after the start.",
  duration_out_of_range: "Choose a duration of 5 to 480 minutes.",
  overlap_confirmation_required: "This overlaps another planned session. Confirm to save anyway.",
  exam_date_warning_confirmation_required: "This is planned after an exam date. Confirm to save anyway.",
  past_entry_read_only: "This session has already started, so it can only be marked as missed.",
  manual_entry_in_future: "Choose a time in the past.",
  manual_entry_too_long: "Choose a duration of 1 minute to 24 hours.",
  daily_total_exceeded: "That day would exceed 24 hours of study.",
  manual_entry_overlaps_session: "This overlaps another recorded session.",
};

/** Fallback for a code the UI has no copy for. */
export const unknownErrorCopy = "Something went wrong. Try again.";

export function messageFor(code: string, fallback?: string): string {
  return errorCopy[code] ?? fallback ?? unknownErrorCopy;
}

/** PU-2 and PU-5 share the rule stated in the field hint. */
export const passwordHint = "10 characters or more";
export const passwordMinLength = 10;

export function passwordRuleMessage(length: number): string | null {
  if (length === 0 || length >= passwordMinLength) return null;
  return `Use at least ${passwordMinLength} characters.`;
}