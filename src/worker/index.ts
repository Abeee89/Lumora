/**
 * ADR-005 worker entry point. One process, pg-boss queue, outbox relay loop.
 * Web and worker start from the same image (DEPLOYMENT-ARCHITECTURE section 4).
 */
import { pathToFileURL } from "node:url";

import { PgBoss } from "pg-boss";
import pg from "pg";

import { config } from "@/kernel/config";
import { requireDatabaseUrl, readEnv } from "@/kernel/env";
import { logger } from "@/kernel/logger";
import { relayOutbox, type JobQueue } from "@/kernel/outbox";

export interface WorkerHandle {
  stop(): Promise<void>;
}

export async function startWorker(databaseUrl: string): Promise<WorkerHandle> {
  const boss = new PgBoss({ connectionString: databaseUrl, schema: "pgboss" });
  boss.on("error", (error: unknown) => logger.error({ err: error }, "worker.queue_error"));
  await boss.start();

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const queue: JobQueue = {
    send: (name, data, options) => boss.send(name, data, options),
  };

  const intervalMs = config.outbox.relayIntervalSeconds * 1000;
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
  const handle = await startWorker(requireDatabaseUrl(readEnv()));
  const shutdown = (signal: string) => {
    logger.info({ signal }, "worker.shutdown");
    void handle.stop().then(() => process.exit(0));
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}