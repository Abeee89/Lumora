"use client";

/**
 * The single fetch helper for browser code. It never throws: a caller always gets either
 * data or a failure with copy to show, so no form has to catch a raw fetch rejection.
 */
export interface ApiFailure {
  code: string;
  message: string;
  details: Record<string, unknown>;
  requestId: string | null;
  status: number;
  retryAfterSeconds: number | null;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; failure: ApiFailure };

export interface FieldIssue {
  path: string;
  rule: string;
}

/** `details.fields` from the server, if the failure carried any. */
export function fieldIssues(failure: ApiFailure): FieldIssue[] {
  const fields = failure.details["fields"];
  if (!Array.isArray(fields)) return [];
  return fields.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const record = entry as Record<string, unknown>;
    const path = record["path"];
    const rule = record["rule"];
    return typeof path === "string" && typeof rule === "string" ? [{ path, rule }] : [];
  });
}

export async function apiRequest<T>(
  path: string,
  init: { method: string; body?: unknown; headers?: Record<string, string> },
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { accept: "application/json", ...init.headers };
  if (init.body !== undefined) headers["content-type"] = "application/json";

  const request: RequestInit = { method: init.method, headers, credentials: "same-origin" };
  if (init.body !== undefined) request.body = JSON.stringify(init.body);

  let response: Response;
  try {
    response = await fetch(path, request);
  } catch {
    return { ok: false, failure: networkFailure() };
  }

  if (response.status === 204) return { ok: true, data: undefined as T };

  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  const text = await response.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (response.ok) return { ok: true, data: parsed as T };

  const envelope = (parsed ?? {}) as Record<string, unknown>;
  const details = envelope["details"];
  return {
    ok: false,
    failure: {
      code: typeof envelope["code"] === "string" ? envelope["code"] : "internal_error",
      message: typeof envelope["message"] === "string" ? envelope["message"] : "",
      details: typeof details === "object" && details !== null ? (details as Record<string, unknown>) : {},
      requestId: typeof envelope["requestId"] === "string" ? envelope["requestId"] : null,
      status: response.status,
      retryAfterSeconds: Number.isNaN(retryAfter) ? null : retryAfter,
    },
  };
}

function networkFailure(): ApiFailure {
  return {
    code: "network_error",
    message: "",
    details: {},
    requestId: null,
    status: 0,
    retryAfterSeconds: null,
  };
}