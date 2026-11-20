/**
 * Throwaway: a persistent embedded PostgreSQL for local smoke runs. Deleted after the
 * M02 browser check (see 08-build/M02-EVIDENCE.md).
 */
import { mkdir } from "node:fs/promises";

import EmbeddedPostgres from "embedded-postgres";

const dataDir = ".artifacts/pg";
await mkdir(dataDir, { recursive: true });

const postgres = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "lumora",
  password: "lumora",
  port: 55432,
  persistent: true,
});

const fresh = process.argv.includes("--fresh");
if (fresh) {
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase("lumora_test");
} else {
  await postgres.start();
}

console.log("postgres ready on 55432");

const stop = async () => {
  await postgres.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

setInterval(() => {}, 1 << 30);
