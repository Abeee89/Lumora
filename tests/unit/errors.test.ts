import { describe, expect, it } from "vitest";

import { AppError, envelopeOf, statusFor, statusOf } from "@/kernel/errors";

describe("error envelope (ERROR-HANDLING section 3)", () => {
  it("maps a known code to its category, status and retry hint", () => {
    const envelope = envelopeOf(new AppError("account_locked"), "req-1");
    expect(envelope).toEqual({
      code: "account_locked",
      category: "authentication",
      message: "The account is temporarily locked.",
      requestId: "req-1",
      retryable: true,
    });
    expect(statusOf("account_locked")).toBe(401);
  });

  it("carries details and retryAfter", () => {
    const envelope = envelopeOf(
      new AppError("rate_limited", { details: { limit: 60 }, retryAfter: 30 }),
      "req-2",
    );
    expect(envelope.details).toEqual({ limit: 60 });
    expect(envelope.retryAfter).toBe(30);
    expect(statusOf("rate_limited")).toBe(429);
  });

  it("hides an unclassified failure behind internal_error", () => {
    const envelope = envelopeOf(new Error("connection string leaked here"), "req-3");
    expect(envelope.code).toBe("internal_error");
    expect(envelope.message).not.toContain("connection string");
    expect(statusFor(new Error("boom"))).toBe(500);
  });

  it("treats cross-user access as not found, never forbidden", () => {
    expect(statusOf("not_found")).toBe(404);
  });
});