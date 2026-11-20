import { describe, expect, it } from "vitest";

import {
  codeChallenge,
  createStateCookie,
  decodePending,
  decodeState,
  encodePending,
  safeNext,
  type GoogleConfig,
} from "@/modules/auth/google";
import { AppError } from "@/kernel/errors";

const google: GoogleConfig = {
  clientId: "client-id.apps.googleusercontent.com",
  clientSecret: "client-secret",
  redirectUri: "http://localhost:3000/api/auth/callback/google",
  appOrigin: "http://localhost:3000",
};

const now = new Date("2026-11-20T10:00:00Z");

describe("Google sign-in state (FR-003)", () => {
  it("round-trips the state cookie the callback will read", () => {
    const created = createStateCookie(google, {
      next: "/settings/profile",
      ageConfirmed: true,
      timezone: "Europe/Berlin",
      now,
    });
    const decoded = decodeState(google, created.cookieValue, now);
    expect(decoded.payload).toEqual(created.payload);
    expect(decoded.payload.timezone).toBe("Europe/Berlin");
    expect(decoded.payload.ageConfirmed).toBe(true);
    expect(decoded.payload.next).toBe("/settings/profile");
    expect(decoded.codeVerifier).toBe(created.codeVerifier);
  });

  it("rejects a state signed with another secret, an edited body and a missing cookie", () => {
    const created = createStateCookie(google, { next: null, ageConfirmed: false, timezone: null, now });
    const [body, signature] = created.cookieValue.split(".") as [string, string];
    const foreign = { ...google, clientSecret: "someone-elses-secret" };

    expect(() => decodeState(foreign, created.cookieValue, now)).toThrow(AppError);
    expect(() => decodeState(google, `${signature}.${body}`, now)).toThrow(AppError);
    expect(() => decodeState(google, body, now)).toThrow(AppError);
    expect(() => decodeState(google, undefined, now)).toThrow(AppError);
    expect(() => decodeState(google, `${body}.${signature}x`, now)).toThrow(AppError);
  });

  it("expires the state after five minutes", () => {
    const created = createStateCookie(google, { next: null, ageConfirmed: false, timezone: null, now });
    const later = new Date(now.getTime() + 5 * 60 * 1000 + 1);
    expect(() => decodeState(google, created.cookieValue, later)).toThrow(AppError);
  });

  it("round-trips the pending cookie PU-6 finishes with", () => {
    const value = encodePending(google, {
      email: "ada@example.com",
      timezone: "America/New_York",
      next: "/settings/profile",
      expiresAt: now.getTime() + 60_000,
    });
    expect(decodePending(google, value, now)).toEqual({
      email: "ada@example.com",
      timezone: "America/New_York",
      next: "/settings/profile",
      expiresAt: now.getTime() + 60_000,
    });
  });

  it("returns null for a tampered, expired or absent pending cookie", () => {
    const value = encodePending(google, {
      email: "ada@example.com",
      timezone: "UTC",
      next: "/",
      expiresAt: now.getTime() + 60_000,
    });
    const foreign = { ...google, clientSecret: "someone-elses-secret" };
    const expired = new Date(now.getTime() + 61_000);

    expect(decodePending(google, value, expired)).toBeNull();
    expect(decodePending(foreign, value, now)).toBeNull();
    expect(decodePending(google, "garbage", now)).toBeNull();
    expect(decodePending(google, undefined, now)).toBeNull();
  });

  it("keeps redirects on this origin", () => {
    expect(safeNext("/settings/profile")).toBe("/settings/profile");
    expect(safeNext("//evil.example/path")).toBe("/");
    expect(safeNext("https://evil.example/path")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });

  it("derives the PKCE challenge exactly as RFC 7636 B.1 shows", () => {
    expect(codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});
