import { z } from "zod";

/**
 * Environment variables only. Numeric product defaults live in `config.ts` (NFR-062);
 * this schema validates what the deployment supplies.
 */
const schema = z.object({
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Exact origin of the application; compared byte for byte by the CSRF check. */
  APP_ORIGIN: z.string().url().optional(),
  /** Number of proxy hops the platform adds; API-SECURITY section 4. */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  /** Set by the platform: cookies take `Secure` and the `__Host-` name. */
  SESSION_COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  /** Directory the local email sink writes to when no provider is configured (U-A2). */
  EMAIL_SINK_DIR: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function readEnv(source: Readonly<Record<string, string | undefined>> = process.env): Env {
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

export function requireAppOrigin(env: Env = readEnv()): string {
  if (env.APP_ORIGIN === undefined) throw new Error("APP_ORIGIN is required for this entry point");
  return env.APP_ORIGIN;
}