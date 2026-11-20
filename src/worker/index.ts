/**
 * ADR-005 worker entry point. One process, pg-boss queue, outbox relay loop.
 * Web and worker start from the same image (DEPLOYMENT-ARCHITECTURE section 4).
 */
import { pathToFileURL } from "node:url";

import { PgBoss } from "pg-boss";
import pg from "pg";

import { config } from "@/kernel/config";
import { poolQueryable } from "@/kernel/db";
import { requireDatabaseUrl, readEnv } from "@/kernel/env";
import { logger } from "@/kernel/logger";
import { relayOutbox, type JobQueue } from "@/kernel/outbox";
import { authCleanupJob } from "@/modules/auth/public";

const scheduledJobs = [authCleanupJob];

export interface WorkerHandle {
  stop(): Promise<void>;
}

export interface WorkerOptions {
  /** Overridable so tests can drive the relay loop without waiting a full interval. */
  relayIntervalMs?: number;
}

export async function startWorker(
  databaseUrl: string,
  options: WorkerOptions = {},
): Promise<WorkerHandle> {
  const boss = new PgBoss({ connectionString: databaseUrl, schema: "pgboss" });
  boss.on("error", (error: unknown) => logger.error({ err: error }, "worker.queue_error"));
  await boss.start();

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const database = poolQueryable(pool);
  const queue: JobQueue = {
    send: (name, data, options) => boss.send(name, data, options),
  };

  // Recurring jobs (BACKGROUND-JOBS section 2). `stately` plus a singleton key keeps two
  // worker instances from running the same tick; the handler is idempotent regardless.
  for (const job of scheduledJobs) {
    await boss.createQueue(job.name, { policy: "stately", retryLimit: 0 });
    await boss.work(job.name, async () => {
      try {
        const result = await job.run(database, new Date());
        logger.info({ job: job.name, result }, "job.ran");
      } catch (error) {
        logger.error({ err: error, job: job.name }, "job.failed");
        throw error;
      }
    });
    await boss.schedule(job.name, job.cron, null, {
      key: "daily",
      singletonKey: `${job.name}:daily`,
    });
  }

  const intervalMs = options.relayIntervalMs ?? config.outbox.relayIntervalSeconds * 1000;
  let inFlight: Promise<void> = Promise.resolve();
  let stopping = false;

  const relayOnce = async (): Promise<void> => {
    try {
      const relayed = await relayOutbox({ pool, queue });
      if (relayed > 0) logger.info({ relayed }, "outbox.relayed");
    } catch (error) {
      logger.error({ err: error }, "outbox.relay_failed");
    }
  };

  // One pass at start, then one per interval; passes never overlap.
  inFlight = inFlight.then(relayOnce);
  const timer = setInterval(() => {
    if (stopping) return;
    inFlight = inFlight.then(relayOnce);
  }, intervalMs);

  logger.info({ intervalMs }, "worker.started");

  return {
    async stop() {
      stopping = true;
      clearInterval(timer);
      await inFlight;
      await boss.stop({ graceful: true });
      await pool.end();
      logger.info({}, "worker.stopped");
    },
  };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  try {
    const handle = await startWorker(requireDatabaseUrl(readEnv()));
    const shutdown = (signal: string) => {
      logger.info({ signal }, "worker.shutdown");
      void handle.stop().then(() => process.exit(0));
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    // A structured line beats a stack trace for whoever reads the container log.
    logger.error({ err: error }, "worker.start_failed");
    process.exit(1);
  }
}