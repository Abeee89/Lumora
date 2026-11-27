import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import EmbeddedPostgres from "embedded-postgres";

import { applyMigrations } from "../../../scripts/apply-migrations";

export interface TestDatabase {
  connectionString: string;
  stop(): Promise<void>;
}

/**
 * Integration tests run against DATABASE_URL when CI supplies a PostgreSQL service,
 * otherwise against an embedded server started in a temporary directory, so the same
 * suite is reproducible on a workstation without Docker.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const provided = process.env.DATABASE_URL;
  if (provided !== undefined) {
    await applyMigrations(provided);
    return { connectionString: provided, stop: async () => {} };
  }

  const dataDir = await mkdtemp(join(tmpdir(), "lumora-pg-"));
  // A fixed port turns any unrelated listener into a suite-wide failure, so the port comes
  // from the pool unless LUMORA_TEST_PG_PORT pins it.
  const port = Number(process.env.LUMORA_TEST_PG_PORT ?? (await freePort()));
  const postgres = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "lumora",
    password: "lumora",
    port,
    persistent: false,
    // UTC keeps the suite hermetic: the server timezone and the native timestamp
    // formatting used by `now()::date` match the UTC sign-ups in every suite.
    initdbFlags: ["--no-locale", "--encoding=UTF8"],
    // The embedded server starts without a timezone; pinning it here keeps `now()::date`
    // on the UTC clock the sign-ups use, so date assertions never drift with the host.
    postgresFlags: ["-c", "timezone=UTC"],
  });
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase("lumora_test");

  const connectionString = `postgresql://lumora:lumora@localhost:${port}/lumora_test`;
  await applyMigrations(connectionString);

  return {
    connectionString,
    async stop() {
      await postgres.stop();
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}

/** Binds port 0, keeps the assigned number and releases it for the server that follows. */
async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  if (port === 0) throw new Error("Could not reserve a port for the test database");
  return port;
}
