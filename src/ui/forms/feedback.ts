"use client";

import { fieldIssues, type ApiFailure } from "../api-client";
import { messageFor } from "../messages";

export type FieldErrors = Record<string, string>;

/**
 * Turns a failure into per-field messages. `ruleText` names the copy for a field issue the
 * server reported by rule; a failure whose code names a field directly is placed by
 * `codeField`.
 */
export function errorsFromFailure(
  failure: ApiFailure,
  options: {
    ruleText?: Readonly<Record<string, string>>;
    codeField?: Readonly<Record<string, string>>;
    fallbackField?: string;
  } = {},
): FieldErrors {
  const errors: FieldErrors = {};
  const codeField = options.codeField?.[failure.code];
  if (codeField !== undefined) {
    errors[codeField] = messageFor(failure.code, failure.message);
  }

  const issues = fieldIssues(failure);
  if (issues.length > 0) {
    const fallbackField = options.fallbackField;
    for (const issue of issues) {
      const field = issue.path === "body" ? (fallbackField ?? issue.path) : issue.path;
      errors[field] = options.ruleText?.[issue.rule] ?? messageFor(failure.code, failure.message);
    }
  } else if (Object.keys(errors).length === 0 && options.fallbackField !== undefined) {
    errors[options.fallbackField] = messageFor(failure.code, failure.message);
  }

  return errors;
}

/** Counts the fields that failed, for the `4 or more` summary rule (DESIGN-SYSTEM 2.13). */
export function errorCount(errors: FieldErrors): number {
  return Object.keys(errors).length;
}