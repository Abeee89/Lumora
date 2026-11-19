/**
 * ADR-005: the transactional outbox. A row written inside the caller's transaction is
 * relayed to pg-boss exactly once.
 *
 * Exactly-once comes from two guarantees:
 * - `relayed_at IS NULL` plus `FOR UPDATE SKIP LOCKED` claims each row for one relay only,
 *   in the same transaction that marks it relayed, so a crash re-relays rather than loses;
 * - the pg-boss `singletonKey` makes a repeated send for the same row a no-op, which needs
 *   the job's queue declared `policy: "stately"`: pg-boss v12 deduplicates a queued key
 *   only for `short`/`stately`/`exclusive` (`singleton` covers active jobs alone).
 */
import { config } from "./config.js";

export interface OutboxEvent {
  jobName: string;
  /** Becomes the pg-boss singleton key; must be stable across retries. */
  idempotencyKey: string;
  payload: Record<string, unknown>;
}

export interface SqlExecutor {
  query<R extends Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: R[] }>;
}

export interface JobQueue {
  /** `singletonKey` deduplicates only on a queue created with a key-aware policy. */
  send(
    name: string,
    data: Record<string, unknown>,
    options: { singletonKey: string },
  ): Promise<string | null>;
}

export interface RelayOptions {
  pool: {
    connect(): Promise<SqlExecutor & { release(): void }>;
  };
  queue: JobQueue;
  batchSize?: number;
}

/** Call with the caller's transaction executor, not the pool (ADR-011 item 7). */
export async function appendOutboxEvent(executor: SqlExecutor, event: OutboxEvent): Promise<string> {
  const { rows } = await executor.query<{ id: string }>(
    `INSERT INTO outbox_events (job_name, idempotency_key, payload)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id::text AS id`,
    [event.jobName, event.idempotencyKey, JSON.stringify(event.payload)],
  );
  const row = rows[0];
  if (row === undefined) throw new Error("outbox insert returned no row");
  return row.id;
}

/** One relay pass. Returns the number of rows relayed. */
export async function relayOutbox(options: RelayOptions): Promise<number> {
  const { pool, queue, batchSize = config.outbox.relayBatchSize } = options;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      id: string;
      job_name: string;
      idempotency_key: string;
      payload: Record<string, unknown>;
    }>(
      `SELECT id::text AS id, job_name, idempotency_key, payload
         FROM outbox_events
        WHERE relayed_at IS NULL
        ORDER BY id
        FOR UPDATE SKIP LOCKED
        LIMIT $1`,
      [batchSize],
    );

    for (const row of rows) {
      await queue.send(row.job_name, row.payload, { singletonKey: row.idempotency_key });
    }

    if (rows.length > 0) {
      await client.query(`UPDATE outbox_events SET relayed_at = now() WHERE id = ANY($1::bigint[])`, [
        rows.map((row) => row.id),
      ]);
    }

    await client.query("COMMIT");
    return rows.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}