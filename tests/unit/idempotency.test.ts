import { describe, expect, it } from "vitest";

import { createMemoryIdempotencyStore, hashRequest, runIdempotent, IdempotencyKeyReuseError } from "@/kernel/idempotency";

describe("idempotent writes (ADR-011, NFR-053)", () => {
  it("runs the effect once and replays the stored result", async () => {
    const store = createMemoryIdempotencyStore();
    let calls = 0;
    const options = {
      store,
      userId: "user-1",
      scope: "session.create",
      key: "key-1",
      payload: { subjectId: "s1", minutes: 25 },
      run: async () => {
        calls += 1;
        return { status: 201, body: { sessionId: "sess-1" } };
      },
    };

    const first = await runIdempotent(options);
    const second = await runIdempotent(options);

    expect(first).toEqual({ status: 201, body: { sessionId: "sess-1" }, replayed: false });
    expect(second).toEqual({ status: 201, body: { sessionId: "sess-1" }, replayed: true });
    expect(calls).toBe(1);
  });

  it("treats key objects with a different member order as the same payload", async () => {
    expect(await hashRequest({ a: 1, b: 2 })).toBe(await hashRequest({ b: 2, a: 1 }));
  });

  it("rejects the same key with a different payload", async () => {
    const store = createMemoryIdempotencyStore();
    const base = {
      store,
      userId: "user-1",
      scope: "session.create",
      key: "key-1",
      run: async () => ({ status: 201, body: {} }),
    };
    await runIdempotent({ ...base, payload: { minutes: 25 } });
    await expect(runIdempotent({ ...base, payload: { minutes: 30 } })).rejects.toBeInstanceOf(
      IdempotencyKeyReuseError,
    );
  });

  it("scopes keys per user", async () => {
    const store = createMemoryIdempotencyStore();
    const run = async () => ({ status: 200, body: {} });
    await runIdempotent({ store, userId: "a", scope: "s", key: "k", payload: {}, run });
    const other = await runIdempotent({ store, userId: "b", scope: "s", key: "k", payload: {}, run });
    expect(other.replayed).toBe(false);
  });
});