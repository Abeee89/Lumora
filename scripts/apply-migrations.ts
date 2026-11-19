/**
 * Applies every migration in `db/migrations` in filename order.
 * Used by the integration tests and by local development; CI stage 9 is a Phase 4
 * decision (DEPLOYMENT-ARCHITECTURE section 4), so this script stays tooling only.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

export async function applyMigrations(databaseUrl: string): Promise<string[]> {
  const directory = fileURLToPath(new URL("../db/migrations/", import.meta.url));
  const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const file of files) {
      const sql = await readFile(join(directory, file), "utf8");
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
  return files;
}

const invokedDirectly = process.argv[1]?.endsWith("apply-migrations.ts") ?? false;
if (invokedDirectly) {
  const url = process.env.DATABASE_URL;
  if (url === undefined) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const applied = await applyMigrations(url);
  console.log(`Applied ${applied.length} migration(s): ${applied.join(", ")}`);
}