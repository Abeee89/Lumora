import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import EmbeddedPostgres from "embedded-postgres";
import { Client, Pool } from "pg";
import { PgBoss } from "pg-boss";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { appendOutboxEvent, relayOutbox, type JobQueue } from "@/kernel/outbox";
import { applyMigrations } from "../../scripts/apply-migrations";

/**
 * MILESTONES M01, integration evidence: an outbox row written inside a transaction is
 * relayed exactly once, a rollback leaves no row, and a repeated pg-boss singleton key
 * stays a single queued job.
 *
 * Uses DATABASE_URL when CI supplies a PostgreSQL service, otherwise starts an
 * embedded server so the evidence is reproducible on a workstation.
 */
describe("outbox relay against PostgreSQL (ADR-005)", () => {
  let connectionString: string;
  let stopDatabase: (() => Promise<void>) | undefined;
  let boss: PgBoss;
  let pool: Pool;
  let adminClient: Client;

  beforeAll(async () => {
    const provided = process.env.DATABASE_URL;
    if (provided !== undefined) {
      connectionString = provided;
    } else {
      const dataDir = await mkdtemp(join(tmpdir(), "lumora-pg-"));
      const port = 55432;
      const postgres = new EmbeddedPostgres({
        databaseDir: dataDir,
        user: "lumora",
        password: "lumora",
        port,
        persistent: false,
      });
      await postgres.initialise();
      await postgres.start();
      await postgres.createDatabase("lumora_test");
      connectionString = `postgresql://lumora:lumora@localhost:${port}/lumora_test`;
      stopDatabase = async () => {
        await postgres.stop();
        await rm(dataDir, { recursive: true, force: true });
      };
    }

    await applyMigrations(connectionString);

    boss = new PgBoss({ connectionString, schema: "pgboss" });
    await boss.start();
    await boss.createQueue("test.noop", { policy: "stately" });

    pool = new Pool({ connectionString });
    adminClient = new Client({ connectionString });
    await adminClient.connect();
  }, 240_000);

  afterAll(async () => {
    await adminClient?.end();
    await pool?.end();
    await boss?.stop({ graceful: false });
    await stopDatabase?.();
  });

  const jobCount = async (): Promise<number> => {
    const result = await adminClient.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pgboss.job WHERE name = 'test.noop'`,
    );
    return Number(result.rows[0]?.count ?? "0");
  };

  const queue: () => JobQueue = () => ({
    send: (name, data, options) => boss.send(name, data, options),
  });

  it("relays a committed row once, and never twice", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await appendOutboxEvent(client, {
        jobName: "test.noop",
        idempotencyKey: "event-1",
        payload: { reference: "row-1" },
      });
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    await expect(relayOutbox({ pool, queue: queue() })).resolves.toBe(1);
    expect(await jobCount()).toBe(1);

    await expect(relayOutbox({ pool, queue: queue() })).resolves.toBe(0);
    expect(await jobCount()).toBe(1);
  });

  it("keeps no outbox row when the caller rolls back", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await appendOutboxEvent(client, {
        jobName: "test.noop",
        idempotencyKey: "event-rolled-back",
        payload: {},
      });
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }

    const result = await adminClient.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM outbox_events WHERE idempotency_key = 'event-rolled-back'`,
    );
    expect(result.rows[0]?.count).toBe("0");
  });

  it("keeps a repeated singleton key to one queued job", async () => {
    const before = await jobCount();
    const jobQueue = queue();
    await jobQueue.send("test.noop", { reference: "same" }, { singletonKey: "dup-1" });
    await jobQueue.send("test.noop", { reference: "same" }, { singletonKey: "dup-1" });
    expect(await jobCount()).toBe(before + 1);
  });

  it("rejects a duplicate outbox idempotency key at the database", async () => {
    await expect(
      adminClient.query(
        `INSERT INTO outbox_events (job_name, idempotency_key, payload) VALUES ('test.noop', 'event-1', '{}'::jsonb)`,
      ),
    ).rejects.toThrow();
  });
});