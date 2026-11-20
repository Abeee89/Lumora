import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  call,
  database,
  errorEnvelopeSchema,
  parseBody,
  profileViewSchema,
  type ApiResponse,
  signInListSchema,
  signInUser,
  signUpUser,
  uniqueEmail,
  uniqueIp,
  type TestUser,
} from "./support/api";
import { resetLinks, startApiEnvironment, type ApiEnvironment } from "./support/environment";

/**
 * MILESTONES M02 acceptance for AUTH-01..AUTH-09: the real route handlers against a real
 * PostgreSQL. The reset case is also a regression test: `completePasswordReset` first
 * shipped with a placeholder the driver could not type (an unused `$2`), so every
 * completed reset answered 500.
 */
describe("authentication endpoints", () => {
  let environment: ApiEnvironment;

  beforeAll(async () => {
    environment = await startApiEnvironment();
  }, 240_000);

  afterAll(async () => {
    // The pool must go first: embedded PostgreSQL drops the connections with an ECONNRESET
    // otherwise, which vitest reports as an unhandled error.
    await database().end();
    await environment?.stop();
  });

  const errorOf = (response: ApiResponse) => parseBody(errorEnvelopeSchema, response, "error");

  it("sign-up creates the user, the credential account and the profile row", async () => {
    const email = uniqueEmail("signup");
    const response = await call("/api/app/auth/sign-up", {
      method: "POST",
      body: { email, password: "correct horse battery", ageConfirmed: true, timezone: "Europe/Berlin" },
      ip: uniqueIp(),
    });

    expect(response.status).toBe(201);
    const view = parseBody(profileViewSchema, response, "/api/app/auth/sign-up");
    expect(view).toMatchObject({
      email,
      displayName: email.split("@")[0],
      timezone: "Europe/Berlin",
      version: 1,
      hasPassword: true,
      googleLinked: false,
    });
    expect(view.onboarding.completedAt).toBeNull();
    expect(response.cookies["lumora_session"]).toBeDefined();
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
    expect(response.headers.get("etag")).toBe('"1"');

    const account = await database().one<{ provider: string; password_hash: string }>(
      "SELECT provider, password_hash FROM auth_accounts WHERE user_id = (SELECT id FROM users WHERE email = $1)",
      [email],
    );
    expect(account?.provider).toBe("credential");
    expect(account?.password_hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);

    const profile = await database().one<{ display_name: string; timezone: string }>(
      "SELECT display_name, timezone FROM user_profiles WHERE user_id = (SELECT id FROM users WHERE email = $1)",
      [email],
    );
    expect(profile).toEqual({ display_name: email.split("@")[0], timezone: "Europe/Berlin" });
  });

  it("refuses a short password, an unconfirmed age gate, an unknown zone and a duplicate email", async () => {
    const email = uniqueEmail("rules");
    const base = { email, ageConfirmed: true, timezone: "UTC" };

    const short = await call("/api/app/auth/sign-up", {
      method: "POST",
      body: { ...base, password: "short" },
      ip: uniqueIp(),
    });
    expect(short.status).toBe(400);
    expect(errorOf(short)).toMatchObject({ code: "password_too_short", details: { minLength: 10 } });

    const unconfirmed = await call("/api/app/auth/sign-up", {
      method: "POST",
      body: { ...base, password: "correct horse battery", ageConfirmed: false },
      ip: uniqueIp(),
    });
    expect(errorOf(unconfirmed)).toMatchObject({ code: "age_confirmation_required" });

    const unknownZone = await call("/api/app/auth/sign-up", {
      method: "POST",
      body: { ...base, password: "correct horse battery", timezone: "Mars/Olympus" },
      ip: uniqueIp(),
    });
    expect(errorOf(unknownZone)).toMatchObject({ code: "invalid_timezone" });

    await signUpUser({ email });
    const duplicate = await call("/api/app/auth/sign-up", {
      method: "POST",
      body: { ...base, password: "correct horse battery" },
      ip: uniqueIp(),
    });
    expect(duplicate.status).toBe(409);
    expect(errorOf(duplicate)).toMatchObject({ code: "duplicate_email" });
    expect(await database().query("SELECT id FROM users WHERE email = $1", [email])).toHaveLength(1);
  });

  it("signs in with the stored password and answers a wrong one like an unknown account", async () => {
    const user = await signUpUser({ timezone: "America/New_York" });

    const wrong = await call("/api/app/auth/sign-in", {
      method: "POST",
      body: { email: user.email, password: "not the password" },
      ip: uniqueIp(),
    });
    expect(wrong.status).toBe(401);
    expect(errorOf(wrong)).toMatchObject({ code: "invalid_credentials" });

    const unknown = await call("/api/app/auth/sign-in", {
      method: "POST",
      body: { email: uniqueEmail("ghost"), password: "not the password" },
      ip: uniqueIp(),
    });
    expect(unknown.status).toBe(401);
    expect(errorOf(unknown)).toMatchObject({ code: "invalid_credentials" });

    const good = await call("/api/app/auth/sign-in", {
      method: "POST",
      body: { email: user.email, password: user.password },
      ip: uniqueIp(),
    });
    expect(good.status).toBe(200);
    expect(parseBody(profileViewSchema, good, "/api/app/auth/sign-in")).toMatchObject({
      email: user.email,
      timezone: "America/New_York",
    });
  });

  it("locks on the fifth failure, refuses the correct password while locked and reports the wait", async () => {
    const user = await signUpUser();
    const ip = uniqueIp();

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await call("/api/app/auth/sign-in", {
        method: "POST",
        body: { email: user.email, password: `wrong-${attempt}` },
        ip,
      });
      expect(response.status, `attempt ${attempt}`).toBe(401);
      expect(errorOf(response)).toMatchObject({ code: "invalid_credentials" });
      expect(response.headers.get("retry-after")).toBeNull();
    }

    const fifth = await call("/api/app/auth/sign-in", {
      method: "POST",
      body: { email: user.email, password: "wrong-5" },
      ip,
    });
    expect(fifth.status).toBe(401);
    expect(errorOf(fifth)).toMatchObject({
      code: "account_locked",
      details: { lockedUntil: expect.any(String) },
    });
    expect(fifth.headers.get("retry-after")).toBe("900");

    const locked = await call("/api/app/auth/sign-in", {
      method: "POST",
      body: { email: user.email, password: user.password },
      ip,
    });
    expect(errorOf(locked)).toMatchObject({ code: "account_locked" });

    const audit = await database().query<{ event_type: string }>(
      "SELECT event_type FROM auth_audit_events WHERE user_id = $1 ORDER BY occurred_at",
      [user.userId],
    );
    // DATA-DICTIONARY section 18 allows exactly sign_in, sign_in_failed, lockout,
    // password_reset, session_revoked and account_deleted; a successful registration is
    // recorded as the sign-in it also performs.
    expect(audit.map((row) => row.event_type)).toEqual([
      "sign_in",
      "sign_in_failed",
      "sign_in_failed",
      "sign_in_failed",
      "sign_in_failed",
      "lockout",
    ]);
  });

  it("sign-out ends exactly the session that asked", async () => {
    const user = await signUpUser();
    const other = await signInUser(user);

    const response = await call("/api/app/auth/sign-out", { method: "POST", cookie: user.cookie });
    expect(response.status).toBe(204);
    expect(response.cookies["lumora_session"]).toBe("");
    expect((await call("/api/app/profile", { cookie: user.cookie })).status).toBe(401);
    expect((await call("/api/app/profile", { cookie: other })).status).toBe(200);
  });

  it("lists sign-ins, marks the current one, revokes one and revokes the others", async () => {
    const user = await signUpUser();
    const second = await signInUser(user);

    const list = await call("/api/app/auth/sign-ins", { cookie: user.cookie });
    expect(list.status).toBe(200);
    const rows = parseBody(signInListSchema, list, "/api/app/auth/sign-ins").data;
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.current)).toHaveLength(1);
    expect(rows.map((row) => row.device)).toContain("Unknown device");

    const foreign = rows.find((row) => !row.current);
    expect(foreign).toBeDefined();
    const revoked = await call(`/api/app/auth/sign-ins/${foreign?.id ?? ""}`, {
      method: "DELETE",
      cookie: user.cookie,
    });
    expect(revoked.status).toBe(204);
    expect((await call("/api/app/profile", { cookie: second })).status).toBe(401);
    expect((await call("/api/app/profile", { cookie: user.cookie })).status).toBe(200);

    const third = await signInUser(user);
    const revokeOthers = await call("/api/app/auth/sign-ins/revoke-others", {
      method: "POST",
      cookie: user.cookie,
    });
    expect(revokeOthers.status).toBe(200);
    expect((await call("/api/app/profile", { cookie: third })).status).toBe(401);
    const remaining = parseBody(
      signInListSchema,
      await call("/api/app/auth/sign-ins", { cookie: user.cookie }),
      "/api/app/auth/sign-ins",
    ).data;
    expect(remaining).toHaveLength(1);
  });

  it("answers a reset request identically for a known and an unknown address", async () => {
    const user = await signUpUser();

    const known = await call("/api/app/auth/password-reset/request", {
      method: "POST",
      body: { email: user.email },
      ip: uniqueIp(),
    });
    const unknown = await call("/api/app/auth/password-reset/request", {
      method: "POST",
      body: { email: uniqueEmail("nobody") },
      ip: uniqueIp(),
    });

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual({});
    expect(unknown.body).toEqual({});

    const issued = await database().one<{ count: string }>(
      "SELECT count(*)::text AS count FROM auth_verifications WHERE user_id = $1",
      [user.userId],
    );
    expect(issued?.count).toBe("1");
  });

  it("completes a reset once, clears the lock, revokes sessions and accepts the new password", async () => {
    const user = await signUpUser();
    const staleSession = await signInUser(user);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await call("/api/app/auth/sign-in", {
        method: "POST",
        body: { email: user.email, password: "wrong" },
        ip: uniqueIp(),
      });
    }
    const locked = await call("/api/app/auth/sign-in", {
      method: "POST",
      body: { email: user.email, password: user.password },
      ip: uniqueIp(),
    });
    expect(errorOf(locked)).toMatchObject({ code: "account_locked" });

    const request = await call("/api/app/auth/password-reset/request", {
      method: "POST",
      body: { email: user.email },
      ip: uniqueIp(),
    });
    expect(request.status).toBe(202);

    const link = (await resetLinks(environment.emailDirectory)).filter((entry) => entry.to === user.email).at(-1);
    expect(link).toBeDefined();

    const completed = await call("/api/app/auth/password-reset/complete", {
      method: "POST",
      body: { token: link?.token ?? "", newPassword: "a brand new passphrase" },
      ip: uniqueIp(),
    });
    expect(completed.status).toBe(204);

    const cleared = await database().one<{ failed_sign_in_count: number; locked_until: Date | null }>(
      "SELECT failed_sign_in_count, locked_until FROM users WHERE id = $1",
      [user.userId],
    );
    expect(cleared).toEqual({ failed_sign_in_count: 0, locked_until: null });
    const reuse = await call("/api/app/auth/password-reset/complete", {
      method: "POST",
      body: { token: link?.token ?? "", newPassword: "another brand new passphrase" },
      ip: uniqueIp(),
    });
    expect(reuse.status).toBe(401);
    expect(errorOf(reuse)).toMatchObject({ code: "reset_token_invalid" });

    expect((await call("/api/app/profile", { cookie: staleSession })).status).toBe(401);
    expect((await call("/api/app/profile", { cookie: user.cookie })).status).toBe(401);

    const signedIn = await call("/api/app/auth/sign-in", {
      method: "POST",
      body: { email: user.email, password: "a brand new passphrase" },
      ip: uniqueIp(),
    });
    expect(signedIn.status).toBe(200);

    const oldPassword = await call("/api/app/auth/sign-in", {
      method: "POST",
      body: { email: user.email, password: user.password },
      ip: uniqueIp(),
    });
    expect(errorOf(oldPassword)).toMatchObject({ code: "invalid_credentials" });

    // The refused old password counted once; the lock itself stays clear.
    const afterRefusal = await database().one<{ locked_until: Date | null }>(
      "SELECT locked_until FROM users WHERE id = $1",
      [user.userId],
    );
    expect(afterRefusal?.locked_until).toBeNull();
  });

  it("rejects a reset token that was never issued", async () => {
    const response = await call("/api/app/auth/password-reset/complete", {
      method: "POST",
      body: { token: "not-a-real-token", newPassword: "a brand new passphrase" },
      ip: uniqueIp(),
    });
    expect(response.status).toBe(401);
    expect(errorOf(response)).toMatchObject({ code: "reset_token_invalid" });
  });

  it("refuses a mutating request from another origin", async () => {
    const response = await call("/api/app/auth/sign-out", {
      method: "POST",
      origin: "https://evil.example",
    });
    expect(response.status).toBe(403);
    expect(errorOf(response)).toMatchObject({ code: "csrf_rejected" });
  });

  it("answers an unauthenticated read and never stores a raw session token", async () => {
    const missing = await call("/api/app/profile");
    expect(missing.status).toBe(401);
    expect(errorOf(missing)).toMatchObject({ code: "unauthenticated" });

    const user = await signUpUser();
    const raw = user.cookie.split("=")[1] ?? "";
    const row = await database().one<{ token_hash: string }>(
      "SELECT token_hash FROM auth_sessions WHERE user_id = $1",
      [user.userId],
    );
    expect(row?.token_hash).not.toBe(raw);
    expect(row?.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps every response outside any cache", async () => {
    const user: TestUser = await signUpUser();
    const response = await call("/api/app/profile", { cookie: user.cookie });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });
});
