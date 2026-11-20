/**
 * Brings the API suite online: a real PostgreSQL, a real database URL and the environment
 * the container reads. Nothing is stubbed, so the route handlers behave exactly as they
 * do behind `next dev`.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { startTestDatabase, type TestDatabase } from "./database";

export interface ApiEnvironment {
  database: TestDatabase;
  emailDirectory: string;
  stop(): Promise<void>;
}

export async function startApiEnvironment(): Promise<ApiEnvironment> {
  const database = await startTestDatabase();
  const emailDirectory = await mkdtemp(join(tmpdir(), "lumora-email-"));

  process.env.DATABASE_URL = database.connectionString;
  process.env.APP_ORIGIN = "http://localhost:3000";
  process.env.EMAIL_SINK_DIR = emailDirectory;
  process.env.SESSION_COOKIE_SECURE = "false";
  process.env.TRUSTED_PROXY_HOPS = "0";
  process.env.LOG_LEVEL = "error";
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REDIRECT_URI;

  return {
    database,
    emailDirectory,
    async stop() {
      await database.stop();
      await rm(emailDirectory, { recursive: true, force: true });
    },
  };
}

/** The reset links the local email sink wrote, oldest first. */
export async function resetLinks(emailDirectory: string): Promise<{ to: string; token: string }[]> {
  const { readdir, readFile } = await import("node:fs/promises");
  const names = (await readdir(emailDirectory)).filter((name) => name.endsWith(".json")).sort();
  const links: { to: string; token: string }[] = [];
  for (const name of names) {
    const message = JSON.parse(await readFile(join(emailDirectory, name), "utf8")) as {
      to: string;
      text: string;
    };
    const token = /token=([A-Za-z0-9_-]+)/.exec(message.text)?.[1];
    if (token !== undefined) links.push({ to: message.to, token });
  }
  return links;
}
