import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { topicEventSubscribers, type TopicEvent } from "@/modules/topics/public";
import {
  bulkPreviewSchema,
  call,
  database,
  errorEnvelopeSchema,
  parseBody,
  signUpUser,
  subjectSchema,
  topicListSchema,
  topicSchema,
  type SubjectWire,
  type TestUser,
  type TopicWire,
} from "./support/api";
import { startApiEnvironment, type ApiEnvironment } from "./support/environment";
import { expectHiddenFromOtherUser } from "./support/ownership";

/**
 * MILESTONES M03 acceptance for TOP-01..TOP-08: creation defaults, validation, status and
 * weight edits with events, full-set reorder, archive and restore, the bulk paste preview
 * and its 200 line cap, and the ownership contract of MODULE-BOUNDARIES 6.
 */
describe("topic endpoints", () => {
  let environment: ApiEnvironment;
  const events: TopicEvent[] = [];

  beforeAll(async () => {
    environment = await startApiEnvironment();
    // M04 registers the Exams subscriber; this records what the routes publish.
    topicEventSubscribers.register("integration-test-recorder", async (event) => {
      events.push(event);
    });
  }, 240_000);

  afterAll(async () => {
    await database().end();
    await environment?.stop();
  });

  const errorOf = (response: { body: unknown; status: number }) =>
    parseBody(errorEnvelopeSchema, response, "error");

  async function createSubject(user: TestUser, name: string): Promise<SubjectWire> {
    const response = await call("/api/app/subjects", {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name, color: "teal" },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(subjectSchema, response, "POST /api/app/subjects");
  }

  async function createTopic(
    user: TestUser,
    subjectId: string,
    name: string,
    extra: Record<string, unknown> = {},
  ): Promise<TopicWire> {
    const response = await call(`/api/app/subjects/${subjectId}/topics`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name, ...extra },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return parseBody(topicSchema, response, "POST topics");
  }

  async function listTopics(user: TestUser, subjectId: string, includeArchived = false): Promise<TopicWire[]> {
    const suffix = includeArchived ? "?includeArchived=true" : "";
    const response = await call(`/api/app/subjects/${subjectId}/topics${suffix}`, {
      cookie: user.cookie,
    });
    expect(response.status).toBe(200);
    return parseBody(topicListSchema, response, "GET topics").data;
  }

  it("creates topics last in order with the documented defaults", async () => {
    const user = await signUpUser();
    const subject = await createSubject(user, "Physics");

    const response = await call(`/api/app/subjects/${subject.id}/topics`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": "topic-create-1" },
      body: { name: "  Kinematics  " },
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("etag")).toBe('"1"');
    const first = parseBody(topicSchema, response, "POST topic");
    expect(response.headers.get("location")).toBe(`/api/app/topics/${first.id}`);
    expect(first).toMatchObject({
      name: "Kinematics",
      subjectId: subject.id,
      weight: 1,
      status: "not_started",
      position: 0,
      archivedAt: null,
      version: 1,
    });

    const second = await createTopic(user, subject.id, "Dynamics", { weight: 4 });
    expect(second).toMatchObject({ weight: 4, position: 1 });

    expect((await listTopics(user, subject.id)).map((topic) => topic.name)).toEqual([
      "Kinematics",
      "Dynamics",
    ]);

    const read = await call(`/api/app/topics/${first.id}`, { cookie: user.cookie });
    expect(read.status).toBe(200);
    expect(read.headers.get("etag")).toBe('"1"');
  });

  it("rejects names, weights and statuses outside the documented rules", async () => {
    const user = await signUpUser();
    const subject = await createSubject(user, "Chemistry");

    const tooLong = await call(`/api/app/subjects/${subject.id}/topics`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name: "x".repeat(151) },
    });
    expect(tooLong.status).toBe(400);
    expect(errorOf(tooLong).code).toBe("validation_failed");

    for (const weight of [0, 6, 2.5]) {
      const response = await call(`/api/app/subjects/${subject.id}/topics`, {
        method: "POST",
        cookie: user.cookie,
        headers: { "idempotency-key": crypto.randomUUID() },
        body: { name: `Topic ${weight}`, weight },
      });
      expect(response.status, `weight ${weight}`).toBe(400);
      expect(errorOf(response).code).toBe("validation_failed");
    }

    const topic = await createTopic(user, subject.id, "Stoichiometry");
    const badStatus = await call(`/api/app/topics/${topic.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { status: "later" },
    });
    expect(badStatus.status).toBe(400);
    expect(errorOf(badStatus).code).toBe("validation_failed");

    const empty = await call(`/api/app/topics/${topic.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: {},
    });
    expect(empty.status).toBe(400);
    expect(errorOf(empty).code).toBe("validation_failed");
  });

  it("edits name, weight and status, publishing the status change once", async () => {
    const user = await signUpUser();
    const subject = await createSubject(user, "Biology");
    const topic = await createTopic(user, subject.id, "Genetics");

    const renamed = await call(`/api/app/topics/${topic.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { name: "Genetics and heredity", weight: 5 },
    });
    expect(renamed.status).toBe(200);
    expect(renamed.headers.get("etag")).toBe('"2"');
    expect(parseBody(topicSchema, renamed, "PATCH topic")).toMatchObject({
      name: "Genetics and heredity",
      weight: 5,
      version: 2,
    });

    const before = events.length;
    const done = await call(`/api/app/topics/${topic.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"2"' },
      body: { status: "done" },
    });
    expect(done.status).toBe(200);
    const statusChange = events.slice(before);
    expect(statusChange).toHaveLength(1);
    expect(statusChange[0]).toMatchObject({
      type: "TopicStatusChanged",
      topicId: topic.id,
      subjectId: subject.id,
      previousStatus: "not_started",
      status: "done",
    });

    const stale = await call(`/api/app/topics/${topic.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"2"' },
      body: { status: "in_progress" },
    });
    expect(stale.status).toBe(409);
    const staleEnvelope = errorOf(stale);
    expect(staleEnvelope.code).toBe("stale_version");
    expect(staleEnvelope.details).toMatchObject({
      current: { id: topic.id, version: 3, status: "done" },
    });

    const noHeader = await call(`/api/app/topics/${topic.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      body: { status: "in_progress" },
    });
    expect(noHeader.status).toBe(400);
    expect(errorOf(noHeader).code).toBe("version_required");
  });

  it("reorders only a complete set of active topics", async () => {
    const user = await signUpUser();
    const subject = await createSubject(user, "History");
    const a = await createTopic(user, subject.id, "A");
    const b = await createTopic(user, subject.id, "B");
    const c = await createTopic(user, subject.id, "C");

    const reordered = await call(`/api/app/subjects/${subject.id}/topics/order`, {
      method: "PUT",
      cookie: user.cookie,
      body: { topicIds: [c.id, a.id, b.id] },
    });
    expect(reordered.status).toBe(200);
    const rows = parseBody(topicListSchema, reordered, "PUT topics/order").data;
    expect(rows.map((topic) => topic.name)).toEqual(["C", "A", "B"]);
    expect(rows.map((topic) => topic.position)).toEqual([0, 1, 2]);

    const partial = await call(`/api/app/subjects/${subject.id}/topics/order`, {
      method: "PUT",
      cookie: user.cookie,
      body: { topicIds: [b.id, a.id] },
    });
    expect(partial.status).toBe(400);
    const partialEnvelope = errorOf(partial);
    expect(partialEnvelope.code).toBe("validation_failed");
    expect(JSON.stringify(partialEnvelope.details)).toContain("topicIds");

    expect((await listTopics(user, subject.id)).map((topic) => topic.name)).toEqual([
      "C",
      "A",
      "B",
    ]);
  });

  it("archives a topic, keeps it readable, and restores it with its state", async () => {
    const user = await signUpUser();
    const subject = await createSubject(user, "Geography");
    const topic = await createTopic(user, subject.id, "Rivers", { weight: 3 });

    await call(`/api/app/topics/${topic.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { status: "in_progress" },
    });

    const before = events.length;
    const archived = await call(`/api/app/topics/${topic.id}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"2"' },
    });
    expect(archived.status).toBe(200);
    const archivedRow = parseBody(topicSchema, archived, "archive topic");
    expect(archivedRow.archivedAt).not.toBeNull();
    expect(archivedRow.version).toBe(3);
    expect(events.slice(before).map((event) => event.type)).toEqual(["TopicArchived"]);

    expect(await listTopics(user, subject.id)).toHaveLength(0);
    expect((await listTopics(user, subject.id, true)).map((row) => row.name)).toEqual(["Rivers"]);

    const readable = await call(`/api/app/topics/${topic.id}`, { cookie: user.cookie });
    expect(readable.status).toBe(200);

    const again = await call(`/api/app/topics/${topic.id}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"3"' },
    });
    expect(again.status).toBe(200);
    expect(parseBody(topicSchema, again, "archive twice").version).toBe(3);

    const restored = await call(`/api/app/topics/${topic.id}/restore`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": '"3"' },
    });
    expect(restored.status).toBe(200);
    expect(parseBody(topicSchema, restored, "restore topic")).toMatchObject({
      archivedAt: null,
      weight: 3,
      status: "in_progress",
      version: 4,
    });
  });

  it("previews a paste, then saves it in input order", async () => {
    const user = await signUpUser();
    const subject = await createSubject(user, "Maths");
    await createTopic(user, subject.id, "Fractions");

    const lines = ["Decimals", " fractions ", "Decimals", "", "  ", "x".repeat(151), "Percentages"];

    const preview = await call(`/api/app/subjects/${subject.id}/topics/bulk`, {
      method: "POST",
      cookie: user.cookie,
      body: { lines, dryRun: true },
    });
    expect(preview.status).toBe(200);
    const previewed = parseBody(bulkPreviewSchema, preview, "bulk preview");
    expect(previewed.valid).toEqual(["Decimals", "Percentages"]);
    expect(previewed.duplicates).toEqual(["fractions", "Decimals"]);
    expect(previewed.tooLong).toEqual(["x".repeat(151)]);

    const blocked = await call(`/api/app/subjects/${subject.id}/topics/bulk`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { lines, dryRun: false },
    });
    expect(blocked.status).toBe(400);
    expect(errorOf(blocked).code).toBe("validation_failed");
    expect(await listTopics(user, subject.id)).toHaveLength(1);

    const key = crypto.randomUUID();
    const saveBody = { lines: ["Decimals", "Percentages", "Ratios"], dryRun: false };
    const saved = await call(`/api/app/subjects/${subject.id}/topics/bulk`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": key },
      body: saveBody,
    });
    expect(saved.status).toBe(201);
    const created = parseBody(topicListSchema, saved, "bulk save").data;
    expect(created.map((topic) => topic.name)).toEqual(["Decimals", "Percentages", "Ratios"]);
    expect(created.map((topic) => topic.position)).toEqual([1, 2, 3]);
    expect(created.every((topic) => topic.weight === 1 && topic.status === "not_started")).toBe(true);
    expect(saved.headers.get("location")).toBe(`/api/app/subjects/${subject.id}/topics`);

    const replay = await call(`/api/app/subjects/${subject.id}/topics/bulk`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": key },
      body: saveBody,
    });
    expect(replay.status).toBe(201);
    expect(replay.headers.get("idempotent-replay")).toBe("true");
    expect(await listTopics(user, subject.id)).toHaveLength(4);

    const noKey = await call(`/api/app/subjects/${subject.id}/topics/bulk`, {
      method: "POST",
      cookie: user.cookie,
      body: saveBody,
    });
    expect(noKey.status).toBe(400);
    expect(errorOf(noKey).code).toBe("idempotency_key_required");
  });

  it("caps a paste at 200 non-blank lines", async () => {
    const user = await signUpUser();
    const subject = await createSubject(user, "Coding");

    const tooMany = Array.from({ length: 201 }, (_, index) => `Problem ${index}`);
    const rejected = await call(`/api/app/subjects/${subject.id}/topics/bulk`, {
      method: "POST",
      cookie: user.cookie,
      body: { lines: tooMany, dryRun: true },
    });
    expect(rejected.status).toBe(400);
    const envelope = errorOf(rejected);
    expect(envelope.code).toBe("input_too_large");
    expect(envelope.details).toEqual({ limit: 200, actual: 201 });

    const atLimitWithBlanks = Array.from({ length: 400 }, (_, index) =>
      index % 2 === 0 ? `Problem ${index}` : "   ",
    );
    const saved = await call(`/api/app/subjects/${subject.id}/topics/bulk`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { lines: atLimitWithBlanks, dryRun: false },
    });
    expect(saved.status, JSON.stringify(saved.body).slice(0, 200)).toBe(201);
    expect(parseBody(topicListSchema, saved, "bulk save at the cap").data).toHaveLength(200);
  });

  it("refuses new topics and pastes on an archived subject", async () => {
    const user = await signUpUser();
    const subject = await createSubject(user, "Latin");
    const topic = await createTopic(user, subject.id, "Verbs");

    await call(`/api/app/subjects/${subject.id}/archive`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "if-match": `"${subject.version}"` },
    });

    const create = await call(`/api/app/subjects/${subject.id}/topics`, {
      method: "POST",
      cookie: user.cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name: "Nouns" },
    });
    expect(create.status).toBe(409);
    expect(errorOf(create).code).toBe("subject_archived");

    const paste = await call(`/api/app/subjects/${subject.id}/topics/bulk`, {
      method: "POST",
      cookie: user.cookie,
      body: { lines: ["Nouns"], dryRun: true },
    });
    expect(paste.status).toBe(409);
    expect(errorOf(paste).code).toBe("subject_archived");

    // Read and edit of existing topics stay available while the subject is archived.
    expect((await listTopics(user, subject.id)).map((row) => row.name)).toEqual(["Verbs"]);
    const edited = await call(`/api/app/topics/${topic.id}`, {
      method: "PATCH",
      cookie: user.cookie,
      headers: { "if-match": '"1"' },
      body: { status: "done" },
    });
    expect(edited.status).toBe(200);
  });

  it("answers not_found for malformed, unknown and foreign ids", async () => {
    const owner = await signUpUser();
    const stranger = await signUpUser();
    const subject = await createSubject(owner, "Private topics");
    const topic = await createTopic(owner, subject.id, "Hidden");

    for (const path of [
      `/api/app/subjects/not-a-uuid/topics`,
      `/api/app/topics/not-a-uuid`,
      `/api/app/topics/0193a000-0000-7000-8000-000000000000`,
    ]) {
      const response = await call(path, { cookie: owner.cookie });
      expect(response.status, path).toBe(404);
      expect(errorOf(response).code).toBe("not_found");
    }

    await expectHiddenFromOtherUser(stranger, {
      label: "GET /api/app/subjects/{id}/topics",
      method: "GET",
      path: `/api/app/subjects/${subject.id}/topics`,
    });
    await expectHiddenFromOtherUser(stranger, {
      label: "POST /api/app/subjects/{id}/topics",
      method: "POST",
      path: `/api/app/subjects/${subject.id}/topics`,
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name: "Stolen" },
    });
    await expectHiddenFromOtherUser(stranger, {
      label: "GET /api/app/topics/{id}",
      method: "GET",
      path: `/api/app/topics/${topic.id}`,
    });
    await expectHiddenFromOtherUser(stranger, {
      label: "PATCH /api/app/topics/{id}",
      method: "PATCH",
      path: `/api/app/topics/${topic.id}`,
      headers: { "if-match": `"${topic.version}"` },
      body: { name: "Stolen" },
    });
    for (const action of ["archive", "restore"]) {
      await expectHiddenFromOtherUser(stranger, {
        label: `POST /api/app/topics/{id}/${action}`,
        method: "POST",
        path: `/api/app/topics/${topic.id}/${action}`,
        headers: { "if-match": `"${topic.version}"` },
      });
    }
  });
});