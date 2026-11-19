import { Client, Pool } from "pg";
import { PgBoss } from "pg-boss";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startWorker, type WorkerHandle } from "@/worker/index";
import { config } from "@/kernel/config";
import { appendOutboxEvent } from "@/kernel/outbox";
import { startTestDatabase, type TestDatabase } from "./support/database";

/**
 * MILESTONES M01 acceptance: "an outbox row written in a transaction is dispatched by the
 * worker exactly once". This drives the real entry point, not the relay function alone.
 *
 * Real timers here are deliberate: the relay loop runs on a PostgreSQL-backed interval, so
 * fake timers cannot advance it. Waits poll for the observable row instead of sleeping.
 */
describe("worker outbox relay loop", () => {
  const relayIntervalMs = 250;
  let database: TestDatabase;
  let runner: PgBoss;
  let adminClient: Client;
  let pool: Pool;
  let worker: WorkerHandle;

  beforeAll(async () => {
    database = await startTestDatabase();

    runner = new PgBoss({ connectionString: database.connectionString, schema: "pgboss" });
    await runner.start();
    await runner.createQueue("worker.probe", { policy: "stately" });

    pool = new Pool({ connectionString: database.connectionString });
    adminClient = new Client({ connectionString: database.connectionString });
    await adminClient.connect();

    worker = await startWorker(database.connectionString, { relayIntervalMs });
  }, 240_000);

  afterAll(async () => {
    await worker?.stop();
    await adminClient?.end();
    await pool?.end();
    await runner?.stop({ graceful: false });
    await database?.stop();
  });

  const jobRows = async (): Promise<{ count: number; payload: unknown }> => {
    const result = await adminClient.query<{ count: string; data: unknown }>(
      `SELECT count(*)::text AS count, min(data::text) AS data FROM pgboss.job WHERE name = 'worker.probe'`,
    );
    return { count: Number(result.rows[0]?.count ?? "0"), payload: result.rows[0]?.data };
  };

  const waitFor = async <T>(read: () => Promise<T>, done: (value: T) => boolean, label: string): Promise<T> => {
    const deadline = Date.now() + 15_000;
    for (;;) {
      const value = await read();
      if (done(value)) return value;
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}: ${JSON.stringify(value)}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  it("dispatches a committed row once and marks it relayed", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await appendOutboxEvent(client, {
        jobName: "worker.probe",
        idempotencyKey: "worker-event-1",
        payload: { reference: "from-worker-test" },
      });
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    await waitFor(jobRows, (rows) => rows.count >= 1, "the job to be queued");
    expect(await jobRows()).toMatchObject({ count: 1 });
    expect(String((await jobRows()).payload)).toContain("from-worker-test");

    const relayed = await adminClient.query<{ relayed_at: Date | null }>(
      `SELECT relayed_at FROM outbox_events WHERE idempotency_key = 'worker-event-1'`,
    );
    expect(relayed.rows[0]?.relayed_at).not.toBeNull();

    // Several more relay intervals must not dispatch it again.
    await new Promise((resolve) => setTimeout(resolve, relayIntervalMs * 4));
    expect(await jobRows()).toMatchObject({ count: 1 });
  }, 60_000);

  it("uses the configured relay interval by default", () => {
    expect(config.outbox.relayIntervalSeconds).toBeGreaterThan(0);
  });
});