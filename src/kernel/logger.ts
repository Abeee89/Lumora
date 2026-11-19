/**
 * NFR-063: structured logs with a request id and no secrets or note content.
 *
 * `scrub` is applied to every object passed to the logger, so a caller cannot leak
 * a password or a token by logging a whole request or row. The redaction list is
 * the single place that decides what counts as secret.
 */
import pino, { type Logger } from "pino";

const REDACTED = "[redacted]";

/** Key names (case-insensitive) whose values never reach a log line. */
const SECRET_KEYS: Readonly<Record<string, true>> = {
  password: true,
  passwordhash: true,
  newpassword: true,
  currentpassword: true,
  token: true,
  accesstoken: true,
  refreshtoken: true,
  idtoken: true,
  resettoken: true,
  sessiontoken: true,
  secret: true,
  apikey: true,
  authorization: true,
  cookie: true,
  "set-cookie": true,
  setcookie: true,
  privatekey: true,
  ciphertext: true,
  notecontent: true,
  body: true,
  note: true,
};

const MAX_DEPTH = 6;

export function scrub<T>(value: T): T {
  return scrubAt(value, 0) as T;
}

function scrubAt(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => scrubAt(item, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value;

  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    out[key] = SECRET_KEYS[key.toLowerCase()] === true ? REDACTED : scrubAt(child, depth + 1);
  }
  return out;
}

export interface LoggerOptions {
  level?: string;
  pretty?: boolean;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const { level = "info", pretty = false } = options;
  return pino({
    level,
    base: { service: "lumora" },
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
      censor: REDACTED,
    },
    formatters: {
      log: (object) => scrub(object) as Record<string, unknown>,
    },
    ...(pretty
      ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } } }
      : {}),
  });
}

export const logger: Logger = createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  pretty: process.env.NODE_ENV !== "production",
});

export function requestLogger(requestId: string, route: string): Logger {
  return logger.child({ requestId, route });
}