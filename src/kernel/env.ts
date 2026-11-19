import { z } from "zod";

/**
 * Environment variables only. Numeric product defaults live in `config.ts` (NFR-062);
 * this schema validates what the deployment supplies.
 */
const schema = z.object({
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }
  return parsed.data;
}

export function requireDatabaseUrl(env: Env = readEnv()): string {
  if (env.DATABASE_URL === undefined) throw new Error("DATABASE_URL is required for this entry point");
  return env.DATABASE_URL;
}