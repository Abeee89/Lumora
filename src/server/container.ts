/**
 * Composition root: the only place that knows every module. Route handlers and server
 * components ask for the container; modules never reach for each other's internals.
 *
 * Created once per process. The database pool, the limiter and the email sender are
 * shared; the clock is the system clock unless a test injects one.
 */
import { config } from "../kernel/config";
import { createDatabase, type Database } from "../kernel/db";
import { readEnv, requireAppOrigin, requireDatabaseUrl, type Env } from "../kernel/env";
import { createLogger } from "../kernel/logger";
import { createPostgresRateLimiter, type RateLimiter } from "../kernel/rate-limit";
import { exportContributors, purgeHandlers } from "../kernel/registries";
import * as auth from "../modules/auth/public";
import { createLocalEmailSink } from "../modules/notifications/public";
import * as profile from "../modules/profile/public";

export interface Container {
  readonly database: Database;
  readonly env: Env;
  readonly appOrigin: string;
  readonly secureCookies: boolean;
  readonly trustedProxyHops: number;
  readonly authDeps: auth.AuthDeps;
  readonly google: auth.GoogleConfig | null;
}

export async function postgresContainer(connectionString: string): Promise<Container> {
  const env = readEnv();
  return createContainer(createDatabase(connectionString), env, requireAppOrigin(env));
}

function createContainer(database: Database, env: Env, appOrigin: string): Container {
  const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV !== "production" });
  const limiter: RateLimiter = createPostgresRateLimiter(database);
  const sender = createLocalEmailSink({
    directory: env.EMAIL_SINK_DIR ?? ".artifacts/emails",
    logger,
  });

  const authDeps: auth.AuthDeps = {
    clock: () => new Date(),
    limiter,
    appOrigin,
    sender,
  };

  const google: auth.GoogleConfig | null =
    env.GOOGLE_CLIENT_ID !== undefined &&
    env.GOOGLE_CLIENT_SECRET !== undefined &&
    env.GOOGLE_REDIRECT_URI !== undefined
      ? {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          redirectUri: env.GOOGLE_REDIRECT_URI,
          appOrigin,
        }
      : null;

  registerContributions(database);

  return {
    database,
    env,
    appOrigin,
    secureCookies: env.SESSION_COOKIE_SECURE,
    trustedProxyHops: env.TRUSTED_PROXY_HOPS,
    authDeps,
    google,
  };
}

let instance: Container | undefined;

export function container(): Container {
  if (instance === undefined) {
    const env = readEnv();
    instance = createContainer(createDatabase(requireDatabaseUrl(env)), env, requireAppOrigin(env));
  }
  return instance;
}

/** NFR-031 face: one purge handler and one export contributor per owned table group. */
export function registerContributions(database: Database): void {
  if (!purgeHandlers.has("profile")) {
    purgeHandlers.register("profile", (userId) => profile.purgeProfile(userId, database));
  }
  if (!purgeHandlers.has("auth")) {
    purgeHandlers.register("auth", (userId) => auth.purgeUser(database, userId, new Date()));
  }
  if (!exportContributors.has("profile")) {
    exportContributors.register("profile", async (userId) => ({
      section: "profile",
      rows: [await profile.exportProfile(userId, database)],
    }));
  }
}

export function sessionCookieName(secure: boolean): string {
  return secure ? config.auth.sessionCookieName : config.auth.devSessionCookieName;
}