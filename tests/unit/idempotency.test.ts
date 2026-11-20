import { describe, expect, it } from "vitest";

import type { Database, Queryable } from "@/kernel/db";
import { AppError } from "@/kernel/errors";
import {
  createMemoryIdempotencyStore,
  hashRequest,
  runIdempotent,
  type IdempotencyStore,
} from "@/kernel/idempotency";

/** The driver needs a transaction; the memory store does not care what is inside it. */
function fakeDatabase(tx: Queryable): Database {
  return {
    async query() {
      return [];
    },
    async one() {
      return undefined;
    },
    async execute() {
      return 0;
    },
    async transaction(work) {
      return work(tx);
    },
    async end() {
      return undefined;
    },
  };
}

function database(): Database {
  return fakeDatabase({
    async query() {
      return [];
    },
  });
}

describe("idempotent writes (ADR-011, NFR-053)", () => {
  it("runs the effect once and replays the stored result", async () => {
    const store = createMemoryIdempotencyStore();
    let calls = 0;
    const options = {
      database: database(),
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
      database: database(),
      store,
      userId: "user-1",
      scope: "session.create",
      key: "key-1",
      run: async () => ({ status: 201, body: {} }),
    };
    await runIdempotent({ ...base, payload: { minutes: 25 } });

    const failure = await runIdempotent({ ...base, payload: { minutes: 30 } }).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(AppError);
    expect((failure as AppError).code).toBe("idempotency_key_reused");
  });

  it("scopes keys per user", async () => {
    const store = createMemoryIdempotencyStore();
    const run = async () => ({ status: 200, body: {} });
    const shared = { database: database(), store, scope: "s", key: "k", payload: {}, run };
    await runIdempotent({ ...shared, userId: "a" });
    const other = await runIdempotent({ ...shared, userId: "b" });
    expect(other.replayed).toBe(false);
  });

  it("answers request_in_progress while the first attempt still holds the key", async () => {
    const store = createMemoryIdempotencyStore();
    const payload = { minutes: 25 };
    await store.reserve({
      userId: "user-1",
      scope: "session.create",
      key: "key-1",
      requestHash: await hashRequest(payload),
      retentionDays: 7,
      reservationSeconds: 30,
    });

    const failure = await runIdempotent({
      database: database(),
      store,
      userId: "user-1",
      scope: "session.create",
      key: "key-1",
      payload,
      run: async () => ({ status: 201, body: {} }),
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AppError);
    expect((failure as AppError).code).toBe("request_in_progress");
    expect((failure as AppError).retryAfter).toBe(1);
  });

  it("releases the key when the effect fails, so the client can retry", async () => {
    const store = createMemoryIdempotencyStore();
    const base = {
      database: database(),
      store,
      userId: "user-1",
      scope: "subject.create",
      key: "key-1",
      payload: { name: "Math", color: "teal" },
    };

    await expect(
      runIdempotent({
        ...base,
        run: async () => {
          throw new AppError("name_conflict");
        },
      }),
    ).rejects.toBeInstanceOf(AppError);

    const retry = await runIdempotent({
      ...base,
      run: async () => ({ status: 201, body: { id: "subject-1" } }),
    });
    expect(retry.replayed).toBe(false);
    expect(retry.body).toEqual({ id: "subject-1" });
  });

  it("stores the result inside the effect's transaction (ADR-011 item 7)", async () => {
    const inner = createMemoryIdempotencyStore();
    const seen: { tx: unknown } = { tx: null };
    const store: IdempotencyStore = {
      ...inner,
      async commit(tx, input) {
        seen.tx = tx;
        await inner.commit(tx, input);
      },
    };
    const tx: Queryable = {
      async query() {
        return [];
      },
    };
    let runTx: unknown = null;

    await runIdempotent({
      database: fakeDatabase(tx),
      store,
      userId: "user-1",
      scope: "subject.create",
      key: "key-1",
      payload: {},
      run: async (innerTx) => {
        runTx = innerTx;
        return { status: 201, body: {} };
      },
    });

    expect(runTx).toBe(tx);
    expect(seen.tx).toBe(tx);
  });
});
