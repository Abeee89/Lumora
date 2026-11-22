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
import { createPostgresIdempotencyStore, type IdempotencyStore } from "../kernel/idempotency";
import { createLogger } from "../kernel/logger";
import { createPostgresRateLimiter, type RateLimiter } from "../kernel/rate-limit";
import { exportContributors, purgeHandlers } from "../kernel/registries";
import * as auth from "../modules/auth/public";
import { createLocalEmailSink } from "../modules/notifications/public";
import * as profile from "../modules/profile/public";
import * as subjects from "../modules/subjects/public";
import * as topics from "../modules/topics/public";
import * as exams from "../modules/exams/public";
import * as plans from "../modules/plans/public";

export interface Container {
  readonly database: Database;
  readonly env: Env;
  readonly appOrigin: string;
  readonly secureCookies: boolean;
  readonly trustedProxyHops: number;
  readonly authDeps: auth.AuthDeps;
  readonly idempotency: IdempotencyStore;
  readonly google: auth.GoogleConfig | null;
}

export async function postgresContainer(connectionString: string): Promise<Container> {
  const env = readEnv();
  return createContainer(createDatabase(connectionString), env, requireAppOrigin(env));
}

function createContainer(database: Database, env: Env, appOrigin: string): Container {
  const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV !== "production" });
  const limiter: RateLimiter = createPostgresRateLimiter(database);
  const idempotency = createPostgresIdempotencyStore(database);
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
    idempotency,
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
  // EC-008: Topics publishes after commit, so the checklist drop is safe to run here.
  if (!topics.topicEventSubscribers.has("exams")) {
    topics.topicEventSubscribers.register("exams", (event) =>
      exams.dropArchivedTopicFromChecklists(event, database),
    );
  }
  // Exams purge before Topics: the checklist cascades from exams, but exam_topics -> topics
  // is NO ACTION (EC-008 keeps archived topics), so the exams rows must go first.
  if (!purgeHandlers.has("exams")) {
    purgeHandlers.register("exams", (userId) => exams.purgeExams(userId, database));
  }
  if (!exportContributors.has("exams")) {
    exportContributors.register("exams", async (userId) => ({
      section: "exams",
      rows: await exams.exportExams(userId, database),
    }));
  }
  // Plans purge before Topics and Subjects: plan_entries -> subjects and -> topics are
  // both NO ACTION (EC-008), so the entries must go first. The handlers run in order.
  if (!purgeHandlers.has("plans")) {
    purgeHandlers.register("plans", (userId) => plans.purgePlans(userId, database));
  }
  if (!exportContributors.has("plans")) {
    exportContributors.register("plans", async (userId) => ({
      section: "plans",
      rows: await plans.exportPlans(userId, database),
    }));
  }
  // Topics registers before Subjects: the composite foreign key from topics to subjects is
  // NO ACTION (BR-029 keeps archived subjects), so a purge must remove the children first.
  // The handlers run in registration order.
  if (!purgeHandlers.has("topics")) {
    purgeHandlers.register("topics", (userId) => topics.purgeTopics(userId, database));
  }
  if (!purgeHandlers.has("subjects")) {
    purgeHandlers.register("subjects", (userId) => subjects.purgeSubjects(userId, database));
  }
  if (!exportContributors.has("subjects")) {
    exportContributors.register("subjects", async (userId) => ({
      section: "subjects",
      rows: await subjects.exportSubjects(userId, database),
    }));
  }
  if (!exportContributors.has("topics")) {
    exportContributors.register("topics", async (userId) => ({
      section: "topics",
      rows: await topics.exportTopics(userId, database),
    }));
  }
}

export function sessionCookieName(secure: boolean): string {
  return secure ? config.auth.sessionCookieName : config.auth.devSessionCookieName;
}