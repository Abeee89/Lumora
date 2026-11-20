import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { purgeHandlers, exportContributors } from "@/kernel/registries";
import { archiveGuards } from "@/modules/subjects/public";
import {
  call,
  database,
  errorEnvelopeSchema,
  parseBody,
  signUpUser,
  subjectCollectionSchema,
  subjectListSchema,
  subjectSchema,
  type SubjectWire,
  type TestUser,
} from "./support/api";
import { startApiEnvironment, type ApiEnvironment } from "./support/environment";
import { expectHiddenFromOtherUser } from "./support/ownership";

/**
 * MILESTONES M03 acceptance for SUBJ-01..SUBJ-07: creation and placement, the active-name
 * rule, optimistic concurrency, reorder as a full set, archive and restore with the rename
 * flow, the archive guard (BR-029), and the ownership contract of MODULE-BOUNDARIES 6.
 */
describe("subject endpoints", () => {
  let environment: ApiEnvironment;
  let guardedSubjectId: string | null = null;

  beforeAll(async () => {
    environment = await startApiEnvironment();
    // M05 registers the real timer guard; this stands in for it and only blocks one id.
    archiveGuards.register("integration-test-timer", async (subjectId) =>
      subjectId === guardedSubjectId
        ? { blocked: true, details: { timerRunId: "run-integration-1" } }
        : { blocked: false },
    );
  }, 240_000);

  afterAll(async () => {
    await database().end();
    await environment?.stop();
  });

  const errorOf = (response: { body: unknown; status: number }) =>
    parseBody(errorEnvelopeSchema, response, "error");

  async function create(user: TestUser, name: string, color = "teal"): Promise<SubjectWire> {
    const response = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name, color },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(subjectSchema, response, "POST /api/app/subjects");
  }

  async function list(user: TestUser, includeArchived = false): Promise<SubjectWire[]> {
    const suffix = includeArchived ? "?includeArchived=true" : "";
    const response = await call(`/api/app/subjects${suffix}`, { cookie: user.cookie });
    expect(response.status).toBe(200);
    return parseBody(subjectListSchema, response, `/api/app/subjects${suffix}`).data;
  }

  it("creates subjects last in the order and lists them with their topic counts", async () => {
    const user = await signUpUser();

    const response = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": "subject-create-1" },
      body: { name: "Mathematics", color: "blue" },
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("etag")).toBe('"1"');
    const first = parseBody(subjectSchema, response, "POST /api/app/subjects");
    expect(response.headers.get("location")).toBe(`/api/app/subjects/${first.id}`);
    expect(first).toMatchObject({ name: "Mathematics", color: "blue", position: 0, version: 1 });

    const second = await create(user, "Physics", "red");
    expect(second.position).toBe(1);

    const rows = await list(user);
    expect(rows.map((row) => row.name)).toEqual(["Mathematics", "Physics"]);
    expect(rows.map((row) => row.topicCount)).toEqual([0, 0]);
    expect(rows.map((row) => row.doneTopicCount)).toEqual([0, 0]);

    const read = await call(`/api/app/subjects/${first.id}`, { cookie: user.cookie });
    expect(read.status).toBe(200);
    expect(read.headers.get("etag")).toBe('"1"');
    expect(parseBody(subjectSchema, read, "GET subject")).toMatchObject({ id: first.id });
  });

  it("replays a keyed create and rejects the same key with another payload", async () => {
    const user = await signUpUser();
    const key = crypto.randomUUID();
    const body = { name: "Chemistry", color: "green" };

    const first = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": key },
      body,
    });
    expect(first.status).toBe(201);

    const replay = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": key },
      body,
    });
    expect(replay.status).toBe(201);
    expect(replay.headers.get("idempotent-replay")).toBe("true");
    expect(parseBody(subjectSchema, replay, "replay")).toMatchObject({
      id: parseBody(subjectSchema, first, "first").id,
    });
    expect(await list(user)).toHaveLength(1);

    const reused = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": key },
      body: { name: "Biology", color: "green" },
    });
    expect(reused.status).toBe(409);
    expect(errorOf(reused).code).toBe("idempotency_key_reused");

    const missing = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      body: { name: "Biology", color: "green" },
    });
    expect(missing.status).toBe(400);
    expect(errorOf(missing).code).toBe("idempotency_key_required");
  });

  it("rejects a duplicate active name case-insensitively and frees it on archive", async () => {
    const user = await signUpUser();
    const math = await create(user, "Math");

    const clash = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name: "  math  ", color: "teal" },
    });
    expect(clash.status).toBe(409);
    const envelope = errorOf(clash);
    expect(envelope.code).toBe("name_conflict");
    expect(envelope.details).toMatchObject({ field: "name", conflictingId: math.id });

    const invalidColor = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name: "Art", color: "purple" },
    });
    expect(invalidColor.status).toBe(400);
    expect(errorOf(invalidColor).code).toBe("validation_failed");

    const emptyName = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name: "   ", color: "teal" },
    });
    expect(emptyName.status).toBe(400);

    const archived = await call(`/api/app/subjects/${math.id}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": `"${math.version}"` },
    });
    expect(archived.status).toBe(200);

    const reuse = await create(user, "math");
    expect(reuse.name).toBe("math");
    expect(reuse.position).toBe(0);
  });

  it("patches with If-Match and reports stale_version with the current row", async () => {
    const user = await signUpUser();
    const subject = await create(user, "History");

    const updated = await call(`/api/app/subjects/${subject.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { name: "World History", color: "violet" },
    });
    expect(updated.status).toBe(200);
    expect(updated.headers.get("etag")).toBe('"2"');
    expect(parseBody(subjectSchema, updated, "PATCH subject")).toMatchObject({
      name: "World History",
      color: "violet",
      version: 2,
    });

    const stale = await call(`/api/app/subjects/${subject.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { name: "Later" },
    });
    expect(stale.status).toBe(409);
    const staleEnvelope = errorOf(stale);
    expect(staleEnvelope.code).toBe("stale_version");
    expect(staleEnvelope.details).toMatchObject({ current: { id: subject.id, version: 2 } });

    const noHeader = await call(`/api/app/subjects/${subject.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      body: { name: "Later" },
    });
    expect(noHeader.status).toBe(400);
    expect(errorOf(noHeader).code).toBe("version_required");

    const emptyPatch = await call(`/api/app/subjects/${subject.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"2"' },
      body: {},
    });
    expect(emptyPatch.status).toBe(400);
    expect(errorOf(emptyPatch).code).toBe("validation_failed");
  });

  it("reorders only a complete set of active subjects", async () => {
    const user = await signUpUser();
    const a = await create(user, "A");
    const b = await create(user, "B");
    const c = await create(user, "C");

    const reordered = await call("/api/app/subjects/order", {
      method: "PUT",
      cookie: user.cookie,
      body: { subjectIds: [c.id, a.id, b.id] },
    });
    expect(reordered.status).toBe(200);
    const rows = parseBody(subjectCollectionSchema, reordered, "PUT subjects/order").data;
    expect(rows.map((row) => row.name)).toEqual(["C", "A", "B"]);
    expect(rows.map((row) => row.position)).toEqual([0, 1, 2]);

    const partial = await call("/api/app/subjects/order", {
      method: "PUT",
      cookie: user.cookie,
      body: { subjectIds: [b.id, a.id] },
    });
    expect(partial.status).toBe(400);
    const partialEnvelope = errorOf(partial);
    expect(partialEnvelope.code).toBe("validation_failed");
    expect(JSON.stringify(partialEnvelope.details)).toContain("subjectIds");

    const duplicate = await call("/api/app/subjects/order", {
      method: "PUT",
      cookie: user.cookie,
      body: { subjectIds: [a.id, a.id, b.id] },
    });
    expect(duplicate.status).toBe(400);

    expect((await list(user)).map((row) => row.name)).toEqual(["C", "A", "B"]);
  });

  it("archives, hides from pickers, restores last, and no-ops when already archived", async () => {
    const user = await signUpUser();
    const keep = await create(user, "Keep");
    const gone = await create(user, "Gone");

    const archived = await call(`/api/app/subjects/${gone.id}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": `"${gone.version}"` },
    });
    expect(archived.status).toBe(200);
    const archivedRow = parseBody(subjectSchema, archived, "archive subject");
    expect(archivedRow.archivedAt).not.toBeNull();
    expect(archivedRow.version).toBe(2);
    expect((await list(user)).map((row) => row.name)).toEqual(["Keep"]);
    expect((await list(user, true)).map((row) => row.name)).toEqual(["Keep", "Gone"]);

    const again = await call(`/api/app/subjects/${gone.id}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"2"' },
    });
    expect(again.status).toBe(200);
    expect(parseBody(subjectSchema, again, "archive again").version).toBe(2);

    const restore = await call(`/api/app/subjects/${gone.id}/restore`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"2"' },
    });
    expect(restore.status).toBe(200);
    expect(parseBody(subjectSchema, restore, "restore subject")).toMatchObject({
      archivedAt: null,
      position: 1,
      version: 3,
    });
    expect((await list(user)).map((row) => row.name)).toEqual(["Keep", "Gone"]);

    const againActive = await call(`/api/app/subjects/${gone.id}/restore`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"3"' },
    });
    expect(againActive.status).toBe(200);
    expect(parseBody(subjectSchema, againActive, "restore active").version).toBe(3);

    expect(keep.position).toBe(0);
  });

  it("asks for a rename when the archived name clashes on restore", async () => {
    const user = await signUpUser();
    const original = await create(user, "Biology");
    await call(`/api/app/subjects/${original.id}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
    });
    await create(user, "Biology");

    const blocked = await call(`/api/app/subjects/${original.id}/restore`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"2"' },
    });
    expect(blocked.status).toBe(409);
    const envelope = errorOf(blocked);
    expect(envelope.code).toBe("name_conflict");
    expect(envelope.details).toMatchObject({ field: "name" });

    const colourOnArchived = await call(`/api/app/subjects/${original.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"2"' },
      body: { color: "cyan" },
    });
    expect(colourOnArchived.status).toBe(409);
    expect(errorOf(colourOnArchived).code).toBe("subject_archived");

    const renamed = await call(`/api/app/subjects/${original.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"2"' },
      body: { name: "Biology (old)" },
    });
    expect(renamed.status).toBe(200);

    const restored = await call(`/api/app/subjects/${original.id}/restore`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"3"' },
    });
    expect(restored.status).toBe(200);
    expect((await list(user)).map((row) => row.name)).toEqual(["Biology", "Biology (old)"]);
  });

  it("blocks an archive while a guard reports a running session", async () => {
    const user = await signUpUser();
    const subject = await create(user, "Guarded");
    guardedSubjectId = subject.id;

    const blocked = await call(`/api/app/subjects/${subject.id}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": `"${subject.version}"` },
    });
    expect(blocked.status).toBe(409);
    const envelope = errorOf(blocked);
    expect(envelope.code).toBe("subject_has_running_session");
    expect(envelope.details).toMatchObject({ timerRunId: "run-integration-1" });
    expect((await list(user)).map((row) => row.name)).toEqual(["Guarded"]);

    guardedSubjectId = null;
    const allowed = await call(`/api/app/subjects/${subject.id}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": `"${subject.version}"` },
    });
    expect(allowed.status).toBe(200);
  });

  it("answers not_found for malformed, unknown and foreign ids", async () => {
    const owner = await signUpUser();
    const stranger = await signUpUser();
    const subject = await create(owner, "Private");

    for (const path of [
      "/api/app/subjects/not-a-uuid",
      "/api/app/subjects/0193a000-0000-7000-8000-000000000000",
    ]) {
      const response = await call(path, { cookie: owner.cookie });
      expect(response.status).toBe(404);
      expect(errorOf(response).code).toBe("not_found");
    }

    await expectHiddenFromOtherUser(stranger, {
      label: "GET /api/app/subjects/{id}",
      method: "GET",
      path: `/api/app/subjects/${subject.id}`,
    });
    await expectHiddenFromOtherUser(stranger, {
      label: "PATCH /api/app/subjects/{id}",
      method: "PATCH",
      path: `/api/app/subjects/${subject.id}`,
      headers: { "if-match": `"${subject.version}"` },
      body: { name: "Stolen" },
    });
    for (const action of ["archive", "restore"]) {
      await expectHiddenFromOtherUser(stranger, {
        label: `POST /api/app/subjects/{id}/${action}`,
        method: "POST",
        path: `/api/app/subjects/${subject.id}/${action}`,
        headers: { "if-match": `"${subject.version}"` },
      });
    }

    const strangerList = await call("/api/app/subjects", { cookie: stranger.cookie });
    expect(parseBody(subjectListSchema, strangerList, "stranger list").data).toHaveLength(0);
  });

  it("rejects a non-boolean includeArchived", async () => {
    const user = await signUpUser();
    const response = await call("/api/app/subjects?includeArchived=yes", { cookie: user.cookie });
    expect(response.status).toBe(400);
    expect(errorOf(response).code).toBe("validation_failed");
  });

  it("purges topics before subjects and exports both (NFR-031)", async () => {
    const user = await signUpUser();
    const subject = await create(user, "Taxonomy");
    const topicResponse = await call(`/api/app/subjects/${subject.id}/topics`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name: "Chapter" },
    });
    expect(topicResponse.status).toBe(201);

    const contributor = (key: string) =>
      exportContributors.entries().find(([name]) => name === key)?.[1];
    const subjectsSection = (await contributor("subjects")?.(user.userId)) as {
      section: string;
      rows: unknown[];
    };
    expect(subjectsSection.section).toBe("subjects");
    expect(subjectsSection.rows).toHaveLength(1);
    const topicsSection = (await contributor("topics")?.(user.userId)) as {
      section: string;
      rows: unknown[];
    };
    expect(topicsSection.section).toBe("topics");
    expect(topicsSection.rows).toHaveLength(1);

    // Registration order is the purge order; subjects last, because the composite foreign
    // key from topics is NO ACTION and a subject delete would otherwise be blocked.
    const handlers = purgeHandlers.entries();
    expect(handlers.map(([key]) => key).slice(-2)).toEqual(["topics", "subjects"]);
    for (const [, handler] of handlers) {
      await handler(user.userId);
    }
    expect(await database().query("SELECT id FROM topics WHERE user_id = $1", [user.userId])).toEqual([]);
    expect(await database().query("SELECT id FROM subjects WHERE user_id = $1", [user.userId])).toEqual([]);
  });
});