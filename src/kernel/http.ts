/**
 * HTTP adapter helpers shared by route handlers (API-CONVENTIONS sections 2 and 11,
 * API-SECURITY section 7).
 *
 * Every response carries `X-Request-Id` and `Cache-Control: no-store`; errors carry the
 * public envelope `{ code, message, details, requestId }` (API-SCHEMAS section 1),
 * never the internal one with `category` and `retryable`.
 */
import type { z } from "zod";

import { config } from "./config";
import { uuidv7 } from "./crypto";
import { AppError, envelopeOf, isAppError, statusFor, type ErrorCode } from "./errors";
import { logger } from "./logger";

export const MAX_BODY_BYTES = config.http.maxBodyBytes;

export interface PublicErrorBody {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}

export function jsonResponse(
  status: number,
  body: unknown,
  requestId: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": requestId,
      ...headers,
    },
  });
}

export function noContentResponse(
  requestId: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store", "x-request-id": requestId, ...headers },
  });
}

export function errorResponse(error: unknown, requestId: string): Response {
  const envelope = envelopeOf(error, requestId);
  const body: PublicErrorBody = {
    code: envelope.code,
    message: envelope.message,
    requestId,
  };
  if (envelope.details !== undefined) body.details = envelope.details;

  const headers: Record<string, string> = {};
  if (envelope.retryAfter !== undefined) headers["retry-after"] = String(envelope.retryAfter);

  return jsonResponse(statusFor(error), body, requestId, headers);
}

/** Runs one route handler, mapping thrown `AppError`s and bugs to the wire envelope. */
export async function handleRoute(
  handler: (requestId: string) => Promise<Response>,
): Promise<Response> {
  const requestId = uuidv7();
  try {
    return await handler(requestId);
  } catch (error) {
    // An unexpected error must be attributable: the same request ID reaches the client.
    if (!isAppError(error)) logger.error({ err: error, requestId }, "request.failed");
    return errorResponse(error, requestId);
  }
}

export async function readJson<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new AppError("validation_failed", {
      details: { fields: [{ path: "content-type", rule: "required" }] },
    });
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new AppError("input_too_large", { details: { limit: MAX_BODY_BYTES } });
  }

  let parsed: unknown;
  try {
    parsed = text.length === 0 ? {} : JSON.parse(text);
  } catch {
    throw new AppError("validation_failed", {
      details: { fields: [{ path: "body", rule: "malformed_json" }] },
    });
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AppError("validation_failed", {
      details: {
        fields: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          rule: issue.code,
        })),
      },
    });
  }
  return result.data;
}

/**
 * API-SECURITY section 7: `Origin` must equal the application origin exactly; when it is
 * absent, `Sec-Fetch-Site: same-origin` is required. Both missing is a refusal.
 */
export function assertSameOrigin(request: Request, appOrigin: string): void {
  const origin = request.headers.get("origin");
  if (origin !== null) {
    if (origin === appOrigin) return;
    throw new AppError("csrf_rejected");
  }
  if (request.headers.get("sec-fetch-site") === "same-origin") return;
  throw new AppError("csrf_rejected");
}

/**
 * API-SECURITY section 4: the rightmost untrusted entry of `X-Forwarded-For`, counting
 * trusted hops from the platform proxy. A route handler has no socket address, so an
 * absent or malformed header yields `null`.
 */
export function clientIp(request: Request, trustedHops: number): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded === null) return null;
  const hops = forwarded.split(",").map((value) => value.trim()).filter((value) => value.length > 0);
  const candidate = hops[hops.length - 1 - trustedHops];
  return candidate === undefined ? null : candidate;
}

export function cookieHeader(
  name: string,
  value: string,
  options: { maxAgeSeconds?: number; secure: boolean; expires?: Date },
): string {
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (options.secure) parts.push("Secure");
  if (options.expires !== undefined) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  return parts.join("; ");
}