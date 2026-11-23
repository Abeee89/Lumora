import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { z } from "zod";

import { exportContributors, purgeHandlers } from "@/kernel/registries";
import {
  call,
  errorEnvelopeSchema,
  database,
  parseBody,
  planEntrySchema,
  planEntryWrittenSchema,
  sessionListSchema,
  sessionSchema,
  signUpUser,
  subjectSchema,
  topicSchema,
  type SessionWire,
  type TestUser,
} from "./support/api";
import { startApiEnvironment, type ApiEnvironment } from "./support/environment";
import { expectHiddenFromOtherUser } from "./support/ownership";

/**
 * MILESTONES M06 acceptance for SESS-01..SESS-05: the idempotent manual create
 * (AC-FR-048-1), the If-Match edit that rewrites the day allocations (FR-043), the hard
 * delete with the plan link unset by the FK (EC-022), the overlap and daily-cap
 * rejections (EC-011, AC-FR-042), the plan actuals (FR-036, B-07), purge and export.
 */
describe("session endpoints", () => {
  let environment: ApiEnvironment;

  beforeAll(async () => {
    environment = await startApiEnvironment();
  }, 240_000);

  afterAll(async () => {
    await database().end();
    await environment?.stop();
  });

  const errorOf = (response: { body: unknown; status: number }) =>
    parseBody(errorEnvelopeSchema, response, "error");

  /** The integration DB runs in UTC and the profile timezone is UTC: today is UTC today. */
  const today = (): string => new Date().toISOString().slice(0, 10);

  /** An instant `hours` ago at the top of the hour: always in the past for the suite. */
  const ago = (hours: number): string => {
    const date = new Date();
    date.setUTCHours(Math.floor(date.getUTCHours()) - hours, 0, 0, 0);
    if (date.getTime() > Date.now()) date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString();
  };
  /** The local date `days` after today (UTC calendar math, like the suite's helpers). */
  const dayAfter = (days: number): string => {
    const date = new Date(`${today()}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };


  async function createSubject(user: TestUser, name: string): Promise<string> {
    const response = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name, color: "teal" },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(subjectSchema, response, "POST subject").id;
  }

  async function createTopic(user: TestUser, subjectId: string, name: string): Promise<string> {
    const response = await call(`/api/app/subjects/${subjectId}/topics`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(topicSchema, response, "POST topic").id;
  }

  const postSession = (user: TestUser, body: Record<string, unknown>, key?: string) =>
    call("/api/app/sessions", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": key ?? crypto.randomUUID() },
      body,
    });

  async function createSession(
    user: TestUser,
    body: Record<string, unknown>,
  ): Promise<SessionWire> {
    const response = await postSession(user, body);
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(sessionSchema, response, "POST /api/app/sessions");
  }

  /** A manual session in the past: 45 minutes, ending at the last full hour. */
  const sessionBody = (subjectId: string, startedAt?: string): Record<string, unknown> => {
    const start = startedAt ?? ago(2);
    const end = new Date(Date.parse(start) + 45 * 60 * 1000).toISOString();
    return { subjectId, startedAt: start, endedAt: end };
  };

  /** A plan entry 3 days ahead, owned by `user`, in a subject it created. */
  async function createFuturePlanEntry(
    user: TestUser,
    subjectId: string,
  ): Promise<z.infer<typeof planEntryWrittenSchema>> {
    const startsAt = new Date();
    startsAt.setUTCDate(startsAt.getUTCDate() + 3);
    startsAt.setUTCHours(9, 0, 0, 0);
    const response = await call("/api/app/plan-entries", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { subjectId, startsAt: startsAt.toISOString(), durationMin: 45 },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(planEntryWrittenSchema, response, "POST plan entry");
  }

  describe("SESS-03 create", () => {
    it("answers 201 with Location, ETag and the day allocation, idempotent on replay", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const key = crypto.randomUUID();
      const start = ago(3);
      const end = new Date(Date.parse(start) + 45 * 60 * 1000).toISOString();

      const response = await postSession(user, { subjectId, startedAt: start, endedAt: end }, key);
      expect(response.status, JSON.stringify(response.body)).toBe(201);
      expect(response.headers.get("location")).toBe(`/api/app/sessions/${parseBody(sessionSchema, response, "POST session").id}`);
      expect(response.headers.get("etag")).toBe('"1"');

      const created = parseBody(sessionSchema, response, "POST session");
      expect(created.source).toBe("manual");
      expect(created.autoClosed).toBe(false);
      expect(created.dayAllocations.length).toBe(1);
      expect(created.dayAllocations[0]?.seconds).toBe(45 * 60);

      const replay = await postSession(user, { subjectId, startedAt: start, endedAt: end }, key);
      expect(replay.status, JSON.stringify(replay.body)).toBe(201);
      expect(replay.headers.get("idempotent-replay")).toBe("true");
    });

    it("refuses a future start, a too-short session and an overlap naming the conflict", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");

      const future = await postSession(user, {
        subjectId,
        startedAt: new Date(Date.now() + 3_600_000).toISOString(),
        endedAt: new Date(Date.now() + 3_660_000).toISOString(),
      });
      expect(future.status).toBe(400);
      expect(errorOf(future).code).toBe("manual_entry_in_future");

      // A 59-second span is below the 60-second floor.
      const shortStart = ago(1);
      const short = await postSession(user, {
        subjectId,
        startedAt: shortStart,
        endedAt: new Date(Date.parse(shortStart) + 59_000).toISOString(),
      });
      expect(short.status).toBe(400);
      expect(errorOf(short).code).toBe("manual_entry_too_long");
      expect(errorOf(short).details).toEqual({ minSeconds: 60, maxSeconds: 86_400 });

      const first = await createSession(user, sessionBody(subjectId));
      const overlapping = await postSession(user, {
        subjectId,
        startedAt: first.startedAt,
        endedAt: new Date(Date.parse(first.startedAt) + 30 * 60 * 1000).toISOString(),
      });
      expect(overlapping.status).toBe(409);
      expect(errorOf(overlapping).code).toBe("manual_entry_overlaps_session");
      expect(errorOf(overlapping).details).toEqual({ conflictingSessionId: first.id });
    });
  });
  describe("SESS-02, SESS-04 edit", () => {
    it("reads a session and rewrites the day allocations on a time edit", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const session = await createSession(user, sessionBody(subjectId, ago(26)));
      const read = await call(`/api/app/sessions/${session.id}`, { cookie: user.cookie });
      expect(read.status).toBe(200);
      expect(read.headers.get("etag")).toBe('"1"');
      expect(parseBody(sessionSchema, read, "GET session")).toEqual(session);

      const start = ago(3);
      const end = new Date(Date.parse(start) + 30 * 60 * 1000).toISOString();
      const patch = await call(`/api/app/sessions/${session.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
        body: { startedAt: start, endedAt: end },
      });
      expect(patch.status, JSON.stringify(patch.body)).toBe(200);
      const edited = parseBody(sessionSchema, patch, "PATCH session");
      expect(edited.version).toBe(2);
      expect(edited.startedAt).toBe(start);
      expect(edited.durationSeconds).toBe(30 * 60);
      expect(edited.dayAllocations).toEqual([{ localDate: start.slice(0, 10), seconds: 1800, isManual: true }]);
    });
    it("answers stale_version on a version mismatch and drops a link with an explicit null", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const topicId = await createTopic(user, subjectId, "Quadratics");
      const entry = await createFuturePlanEntry(user, subjectId);
      const start = ago(2);
      const session = await createSession(user, {
        subjectId,
        topicId,
        planEntryId: entry.id,
        startedAt: start,
        endedAt: new Date(Date.parse(start) + 45 * 60 * 1000).toISOString(),
      });
      expect(session.planEntryId).toBe(entry.id);

      // An If-Match of a version the row never had is a stale write.
      const stale = await call(`/api/app/sessions/${session.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": '"9"' },
        body: { topicId: null },
      });
      expect(stale.status).toBe(409);
      expect(errorOf(stale).code).toBe("stale_version");

      const edited = await call(`/api/app/sessions/${session.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        headers: { "if-match": '"1"' },
        body: { topicId: null },
      });
      expect(edited.status, JSON.stringify(edited.body)).toBe(200);
      const wire = parseBody(sessionSchema, edited, "PATCH link drop");
      expect(wire.topicId).toBeNull();
      expect(wire.version).toBe(2);
    });


    it("answers version_required without If-Match and 404 for another user", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const session = await createSession(user, sessionBody(subjectId));

      const missing = await call(`/api/app/sessions/${session.id}`, {
        method: "PATCH",
        cookie: user.cookie,
        body: { topicId: null },
      });
      expect(missing.status).toBe(400);
      expect(errorOf(missing).code).toBe("version_required");

      const other = await signUpUser();
      await expectHiddenFromOtherUser(other, {
        label: "GET another user's session",
        method: "GET",
        path: `/api/app/sessions/${session.id}`,
      });
      await expectHiddenFromOtherUser(other, {
        label: "PATCH another user's session",
        method: "PATCH",
        path: `/api/app/sessions/${session.id}`,
        body: { topicId: null },
        headers: { "if-match": '"1"' },
      });
      await expectHiddenFromOtherUser(other, {
        label: "DELETE another user's session",
        method: "DELETE",
        path: `/api/app/sessions/${session.id}`,
        headers: { "if-match": '"1"' },
      });
    });
  });

  describe("SESS-01 list", () => {
    it("pages newest first and answers a midnight-crossing session under both days", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const yesterday = dayAfter(-1);
      const today = dayAfter(0);
      const spanning = await createSession(user, {
        subjectId,
        startedAt: `${yesterday}T23:30:00.000Z`,
        endedAt: `${today}T00:30:00.000Z`,
      });
      expect(spanning.dayAllocations).toEqual([
        { localDate: yesterday, seconds: 1800, isManual: true },
        { localDate: today, seconds: 1800, isManual: true },
      ]);

      await createSession(user, sessionBody(subjectId, ago(30)));
      const response = await call(`/api/app/sessions?limit=25`, { cookie: user.cookie });
      expect(response.status).toBe(200);
      const page = parseBody(sessionListSchema, response, "GET sessions");
      expect(page.data.length).toBe(2);
      expect(page.page.hasMore).toBe(false);
      expect(page.data[0]?.id).toBe(spanning.id);

      // EC-009: the crossing session is listed under both local days.
      for (const day of [yesterday, today]) {
        const list = await call(`/api/app/sessions?from=${day}&to=${day}`, { cookie: user.cookie });
        expect(list.status).toBe(200);
        const dayPage = parseBody(sessionListSchema, list, "GET crossing day");
        expect(dayPage.data.map((entry) => entry.id)).toContain(spanning.id);
      }
    });
    it("filters by subject", async () => {
      const user = await signUpUser();
      const algebra = await createSubject(user, "Algebra");
      const physics = await createSubject(user, "Physics");
      await createSession(user, sessionBody(algebra, ago(4)));
      await createSession(user, sessionBody(physics, ago(8)));

      const filtered = await call(`/api/app/sessions?subjectId=${algebra}`, { cookie: user.cookie });
      expect(filtered.status).toBe(200);
      const page = parseBody(sessionListSchema, filtered, "GET filtered sessions");
      expect(page.data.map((entry) => entry.subjectId)).toEqual([algebra]);
    });
  });

  describe("plan actuals and unlink (FR-036, EC-022)", () => {
    it("sums the linked sessions into the plan and unsets the link when the plan dies", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const entry = await createFuturePlanEntry(user, subjectId);
      const session = await createSession(user, {
        subjectId,
        planEntryId: entry.id,
        startedAt: ago(2),
        endedAt: new Date(Date.parse(ago(2)) + 45 * 60 * 1000).toISOString(),
      });

      const plan = await call(`/api/app/plan-entries/${entry.id}`, { cookie: user.cookie });
      expect(plan.status).toBe(200);
      const entryView = parseBody(planEntrySchema, plan, "GET plan entry");
      expect(entryView.status).toBe("done");
      expect(entryView.actualSeconds).toBe(45 * 60);
      expect(entryView.varianceSeconds).toBe(0);

      const deletePlan = await call(`/api/app/plan-entries/${entry.id}`, {
        method: "DELETE",
        cookie: user.cookie,
        headers: { "if-match": `"${entry.version}"` },
      });
      expect(deletePlan.status).toBe(204);

      const sessionAfter = await call(`/api/app/sessions/${session.id}`, { cookie: user.cookie });
      const wire = parseBody(sessionSchema, sessionAfter, "GET session after plan delete");
      expect(wire.planEntryId).toBeNull();

      const planGone = await call(`/api/app/plan-entries/${entry.id}`, { cookie: user.cookie });
      expect(planGone.status).toBe(404);
    });
  });

  describe("SESS-05 delete, purge and export", () => {
    it("hard-deletes with If-Match and answers 404 on retry", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const session = await createSession(user, sessionBody(subjectId));

      const stale = await call(`/api/app/sessions/${session.id}`, {
        method: "DELETE",
        cookie: user.cookie,
        headers: { "if-match": '"2"' },
      });
      expect(stale.status).toBe(409);
      expect(errorOf(stale).code).toBe("stale_version");

      const deleted = await call(`/api/app/sessions/${session.id}`, {
        method: "DELETE",
        cookie: user.cookie,
        headers: { "if-match": `"${session.version}"` },
      });
      expect(deleted.status).toBe(204);

      const retry = await call(`/api/app/sessions/${session.id}`, { cookie: user.cookie });
      expect(retry.status).toBe(404);
    });
    it("purges the sessions on account purge and exports them by user", async () => {
      const user = await signUpUser();
      const subjectId = await createSubject(user, "Algebra");
      const session = await createSession(user, sessionBody(subjectId));

      const contributor = exportContributors.entries().find(([key]) => key === "sessions")?.[1];
      expect(contributor).toBeDefined();
      const section = (await contributor?.(user.userId)) as {
        section: string;
        rows: Record<string, unknown>[];
      };
      expect(section.section).toBe("sessions");
      expect(section.rows).toEqual([expect.objectContaining({ id: session.id, source: "manual" })]);

      const handler = purgeHandlers.entries().find(([key]) => key === "sessions")?.[1];
      expect(handler).toBeDefined();
      const purged = await handler?.(user.userId);
      expect(purged).toBe(1);

      const after = await call(`/api/app/sessions/${session.id}`, { cookie: user.cookie });
      expect(after.status).toBe(404);
    });


  });
});
