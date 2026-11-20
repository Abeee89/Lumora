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