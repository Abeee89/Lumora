import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { exportContributors, purgeHandlers } from "@/kernel/registries";
import {
  call,
  database,
  errorEnvelopeSchema,
  parseBody,
  profileViewSchema,
  signUpUser,
  uniqueIp,
  type ApiResponse,
} from "./support/api";
import { startApiEnvironment, type ApiEnvironment } from "./support/environment";
import { expectHiddenFromOtherUser, signInIds } from "./support/ownership";

const onboardingSchema = z.object({
  completedAt: z.string().nullable(),
  dismissedAt: z.string().nullable(),
  steps: z.record(z.string(), z.string()),
});

/**
 * MILESTONES M02 acceptance for PROF-01..PROF-03 plus the ownership contract
 * (MODULE-BOUNDARIES section 6) and the optimistic concurrency of ADR-011.
 */
describe("profile endpoints", () => {
  let environment: ApiEnvironment;

  beforeAll(async () => {
    environment = await startApiEnvironment();
  }, 240_000);

  afterAll(async () => {
    await database().end();
    await environment?.stop();
  });

  const errorOf = (response: ApiResponse) => parseBody(errorEnvelopeSchema, response, "error");

  it("reads the profile the sign-up created and patches it one version at a time", async () => {
    const user = await signUpUser({ timezone: "UTC" });

    const read = await call("/api/app/profile", { cookie: user.cookie });
    expect(read.status).toBe(200);
    expect(read.headers.get("etag")).toBe('"1"');
    const before = parseBody(profileViewSchema, read, "/api/app/profile");
    expect(before).toMatchObject({ email: user.email, timezone: "UTC", theme: "system", version: 1 });

    const patched = await call("/api/app/profile", {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { displayName: "Ada L.", timezone: "Europe/Berlin", theme: "dark", primaryGoal: "exam_prep" },
    });
    expect(patched.status).toBe(200);
    expect(patched.headers.get("etag")).toBe('"2"');
    expect(parseBody(profileViewSchema, patched, "/api/app/profile")).toMatchObject({
      displayName: "Ada L.",
      timezone: "Europe/Berlin",
      theme: "dark",
      primaryGoal: "exam_prep",
      version: 2,
    });

    const stored = await database().one<{ display_name: string; theme: string; version: number }>(
      "SELECT display_name, theme, version FROM user_profiles WHERE user_id = $1",
      [user.userId],
    );
    expect(stored).toEqual({ display_name: "Ada L.", theme: "dark", version: 2 });
  });

  it("requires If-Match and answers a stale one with the current profile (EC-020, ADR-011)", async () => {
    const user = await signUpUser();

    const missing = await call("/api/app/profile", {
      method: "PATCH",
      cookie: user.cookie,
      body: { displayName: "No header" },
    });
    expect(missing.status).toBe(400);
    expect(errorOf(missing)).toMatchObject({ code: "version_required" });

    const unparsable = await call("/api/app/profile", {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": "not-a-version" },
      body: { displayName: "Bad header" },
    });
    expect(errorOf(unparsable)).toMatchObject({ code: "version_required" });

    const first = await call("/api/app/profile", {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { displayName: "First writer" },
    });
    expect(first.status).toBe(200);

    const stale = await call("/api/app/profile", {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { displayName: "Second writer" },
    });
    expect(stale.status).toBe(409);
    const conflict = errorOf(stale);
    expect(conflict.code).toBe("stale_version");
    const current = parseBody(
      profileViewSchema,
      { body: (conflict.details as { current?: unknown } | undefined)?.current, status: 409 },
      "details.current",
    );
    expect(current).toMatchObject({ displayName: "First writer", version: 2 });

    const after = await call("/api/app/profile", { cookie: user.cookie });
    expect(parseBody(profileViewSchema, after, "/api/app/profile").displayName).toBe("First writer");
  });

  it("validates every patchable field before writing", async () => {
    const user = await signUpUser();

    const patch = (body: unknown) =>
      call("/api/app/profile", {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
        body,
      });

    const empty = await patch({});
    expect(empty.status).toBe(400);
    expect(errorOf(empty)).toMatchObject({ code: "validation_failed" });

    const longName = await patch({ displayName: "x".repeat(51) });
    expect(errorOf(longName)).toMatchObject({
      code: "validation_failed",
      details: { fields: [{ path: "displayName", rule: "length", min: 1, max: 50 }] },
    });

    const unknownZone = await patch({ timezone: "Mars/Olympus" });
    expect(unknownZone.status).toBe(400);
    expect(errorOf(unknownZone)).toMatchObject({ code: "invalid_timezone" });

    const badHour = await patch({ rolloverHour: 24 });
    expect(errorOf(badHour)).toMatchObject({
      code: "validation_failed",
      details: { fields: [{ path: "rolloverHour", rule: "range", min: 0, max: 23 }] },
    });

    const unknownField = await patch({ nickname: "Ada" });
    expect(errorOf(unknownField)).toMatchObject({ code: "validation_failed" });

    const stored = await database().one<{ version: number }>(
      "SELECT version FROM user_profiles WHERE user_id = $1",
      [user.userId],
    );
    expect(stored?.version).toBe(1);
  });

  it("records onboarding steps, completes and reopens the wizard (FR-134..FR-137)", async () => {
    const user = await signUpUser();

    const step = await call("/api/app/profile/onboarding", {
      method: "PATCH",
      cookie: user.cookie,
      body: { action: "complete_step", step: "first_subject" },
    });
    expect(step.status).toBe(200);
    const afterStep = parseBody(onboardingSchema, step, "/api/app/profile/onboarding");
    expect(Object.keys(afterStep.steps)).toEqual(["first_subject"]);
    expect(afterStep.completedAt).toBeNull();

    const unknownStep = await call("/api/app/profile/onboarding", {
      method: "PATCH",
      cookie: user.cookie,
      body: { action: "complete_step", step: "not_a_step" },
    });
    expect(unknownStep.status).toBe(400);
    // The schema refuses the value before the service does, so only the field is fixed.
    expect(errorOf(unknownStep)).toMatchObject({
      code: "validation_failed",
      details: { fields: [{ path: "step" }] },
    });

    const complete = await call("/api/app/profile/onboarding", {
      method: "PATCH",
      cookie: user.cookie,
      body: { action: "complete" },
    });
    const completed = parseBody(onboardingSchema, complete, "/api/app/profile/onboarding");
    expect(completed.completedAt).toBeTypeOf("string");

    const reopen = await call("/api/app/profile/onboarding", {
      method: "PATCH",
      cookie: user.cookie,
      body: { action: "reopen" },
    });
    const reopened = parseBody(onboardingSchema, reopen, "/api/app/profile/onboarding");
    expect(reopened.completedAt).toBeNull();

    const dismiss = await call("/api/app/profile/onboarding", {
      method: "PATCH",
      cookie: user.cookie,
      body: { action: "dismiss" },
    });
    expect(parseBody(onboardingSchema, dismiss, "/api/app/profile/onboarding").dismissedAt).toBeTypeOf("string");
  });

  it("hides another user's sign-in as if it did not exist (MODULE-BOUNDARIES section 6)", async () => {
    const actor = await signUpUser();
    const victim = await signUpUser();
    const [victimSignIn] = await signInIds(victim);
    expect(victimSignIn).toBeDefined();

    await expectHiddenFromOtherUser(actor, {
      label: "AUTH-08 revoke",
      method: "DELETE",
      path: `/api/app/auth/sign-ins/${victimSignIn ?? ""}`,
    });

    const unknown = await call("/api/app/auth/sign-ins/0192f7d4-0000-7000-8000-000000000000", {
      method: "DELETE",
      cookie: actor.cookie,
    });
    expect(unknown.status).toBe(404);

    const malformed = await call("/api/app/auth/sign-ins/not-a-uuid", {
      method: "DELETE",
      cookie: actor.cookie,
    });
    expect(malformed.status).toBe(404);
    expect(errorOf(malformed)).toMatchObject({ code: "not_found" });

    // The victim's session is untouched by all three attempts.
    expect(await signInIds(victim)).toContain(victimSignIn);
  });

  it("registers a working purge handler and export contributor for every owned table group", async () => {
    const user = await signUpUser({ timezone: "America/New_York" });

    // M04 adds the exams group and M05 the plans group; the per-table behaviour of both
    // is covered by tests/integration/exams.test.ts and plans.test.ts. Plans purge before
    // topics and subjects because plan_entries -> subjects is NO ACTION.
    expect(purgeHandlers.keys()).toEqual(["profile", "auth", "exams", "plans", "topics", "subjects"]);
    expect(exportContributors.keys()).toEqual(["profile", "exams", "plans", "subjects", "topics"]);

    const contributor = exportContributors.entries().find(([key]) => key === "profile")?.[1];
    const section = (await contributor?.(user.userId)) as { section: string; rows: unknown[] };
    expect(section.section).toBe("profile");
    expect(section.rows).toHaveLength(1);
    // The profile module owns the profile row; the account columns (`users`) have no
    // contributor yet, which M14 must add before an export is complete (see M02 evidence).
    expect(section.rows[0]).toMatchObject({ timezone: "America/New_York", theme: "system" });

    // The auth handler owns `users` and cascades: sessions, verifications, profile, keys.
    const purge = purgeHandlers.entries().find(([key]) => key === "auth")?.[1];
    expect(await purge?.(user.userId)).toBe(1);
    expect(await database().query("SELECT 1 FROM users WHERE id = $1", [user.userId])).toEqual([]);
    expect(await database().query("SELECT 1 FROM user_profiles WHERE user_id = $1", [user.userId])).toEqual([]);
    const tombstones = await database().query<{ event_type: string; user_id: string | null }>(
      "SELECT event_type, user_id FROM auth_audit_events WHERE event_type = 'account_deleted'",
    );
    expect(tombstones.at(-1)).toEqual({ event_type: "account_deleted", user_id: null });
  });

  it("reports a profile request without a session as unauthenticated", async () => {
    const response = await call("/api/app/profile");
    expect(response.status).toBe(401);
    expect(errorOf(response)).toMatchObject({ code: "unauthenticated" });
    expect(await call("/api/app/profile", { cookie: "lumora_session=guessed", ip: uniqueIp() })).toMatchObject({
      status: 401,
    });
  });
});
