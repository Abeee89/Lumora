import { mkdtemp, rm } from "node:fs/promises";
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