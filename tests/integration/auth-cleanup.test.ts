import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { PgBoss } from "pg-boss";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { config } from "@/kernel/config";
import { createDatabase, type Database } from "@/kernel/db";
import { runAuthCleanup } from "@/modules/auth/public";
import { startWorker, type WorkerHandle } from "@/worker/index";
import { startTestDatabase, type TestDatabase } from "./support/database";

/**
 * MILESTONES M02: "Audit events written and retention job runs". The handler is driven
 * directly for its rules and through the real worker for its wiring: the cron row, the
 * queue policy, and one dispatched tick that performs the deletion.
 */
describe("auth cleanup job", () => {
  const now = new Date("2026-11-20T12:00:00.000Z");
  let database: TestDatabase;
  let admin: Database;
  let client: Client;

  beforeAll(async () => {
    database = await startTestDatabase();
    admin = createDatabase(database.connectionString);
    client = new Client({ connectionString: database.connectionString });
    await client.connect();
  }, 240_000);

  afterAll(async () => {
    await client?.end();
    await admin?.end();
    await database?.stop();
  });

  const newUser = async (): Promise<string> => {
    const id = randomUUID();
    await admin.query(
      `INSERT INTO users (id, email, email_verified, age_confirmed_at, created_at, updated_at)
       VALUES ($1, $2, true, $3, $3, $3)`,
      [id, `cleanup-${id}@example.com`, now.toISOString()],
    );
    return id;
  };

  const daysAgo = (days: number): string => new Date(now.getTime() - days * 86_400_000).toISOString();

  it("removes expired sessions, spent reset tokens and audit events past retention", async () => {
    const user = await newUser();

    await admin.query(
      `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_active_at)
       VALUES
         ($1, $2, 'expired-session', $3, $4, $4),
         ($5, $2, 'live-session', $6, $4, $4)`,
      [
        randomUUID(),
        user,
        daysAgo(1),
        daysAgo(2),
        randomUUID(),
        new Date(now.getTime() + 86_400_000).toISOString(),
      ],
    );

    await admin.query(
      `INSERT INTO auth_verifications (id, user_id, purpose, token_hash, expires_at, created_at, consumed_at)
       VALUES
         ($1, $2, 'password_reset', 'expired-token', $3, $4, null),
         ($5, $2, 'password_reset', 'spent-token', $6, $4, $4),
         ($7, $2, 'password_reset', 'live-token', $6, $4, null)`,
      [
        randomUUID(),
        user,
        daysAgo(1),
        daysAgo(2),
        randomUUID(),
        new Date(now.getTime() + 3_600_000).toISOString(),
        randomUUID(),
      ],
    );

    await admin.query(
      `INSERT INTO auth_audit_events (id, user_id, event_type, occurred_at)
       VALUES
         ($1, $2, 'sign_in', $3),
         ($4, $2, 'sign_in', $5)`,
      [
        randomUUID(),
        user,
        daysAgo(config.auth.auditRetentionDays + 1),
        randomUUID(),
        daysAgo(config.auth.auditRetentionDays - 1),
      ],
    );

    // The expired token and the spent one go; the live token stays.
    expect(await runAuthCleanup(admin, now)).toEqual({ sessions: 1, resetTokens: 2, auditEvents: 1 });

    const sessions = await admin.query<{ token_hash: string }>(
      "SELECT token_hash FROM auth_sessions WHERE user_id = $1",
      [user],
    );
    expect(sessions.map((row) => row.token_hash)).toEqual(["live-session"]);

    const verifications = await admin.query<{ token_hash: string }>(
      "SELECT token_hash FROM auth_verifications WHERE user_id = $1",
      [user],
    );
    expect(verifications.map((row) => row.token_hash)).toEqual(["live-token"]);

    const audit = await admin.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM auth_audit_events WHERE user_id = $1",
      [user],
    );
    expect(audit[0]?.count).toBe("1");

    // A second run on the same day finds nothing left: the job is safe to retry.
    expect(await runAuthCleanup(admin, now)).toEqual({ sessions: 0, resetTokens: 0, auditEvents: 0 });
  }, 60_000);

  it("is scheduled on the daily cron and runs when the worker picks the queue up", async () => {
    const worker: WorkerHandle = await startWorker(database.connectionString, { relayIntervalMs: 60_000 });
    const runner = new PgBoss({ connectionString: database.connectionString, schema: "pgboss" });
    try {
      const queue = await client.query<{ policy: string; retry_limit: number }>(
        "SELECT policy, retry_limit FROM pgboss.queue WHERE name = $1",
        [config.jobs.authCleanupQueue],
      );
      expect(queue.rows[0]).toMatchObject({ policy: "stately", retry_limit: 0 });

      const schedule = await client.query<{ key: string; cron: string; timezone: string }>(
        "SELECT key, cron, timezone FROM pgboss.schedule WHERE name = $1",
        [config.jobs.authCleanupQueue],
      );
      expect(schedule.rows[0]).toMatchObject({
        key: "daily",
        cron: config.jobs.authCleanupCron,
        timezone: "UTC",
      });

      const user = await newUser();
      const session = randomUUID();
      await admin.query(
        `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_active_at)
         VALUES ($1, $2, 'worker-expired', $3, $4, $4)`,
        [session, user, daysAgo(1), daysAgo(2)],
      );

      // A separate client sends the tick the cron would send; the worker's handler owns it.
      await runner.start();
      await runner.send(config.jobs.authCleanupQueue, {});

      const deadline = Date.now() + 30_000;
      let remaining = 1;
      while (remaining > 0 && Date.now() < deadline) {
        const rows = await admin.query<{ count: string }>(
          "SELECT count(*)::text AS count FROM auth_sessions WHERE id = $1",
          [session],
        );
        remaining = Number(rows[0]?.count ?? "1");
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, 200));
      }
      expect(remaining).toBe(0);
    } finally {
      await runner.stop({ graceful: false });
      await worker.stop();
    }
  }, 120_000);
});
