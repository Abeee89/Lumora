/**
 * ADR-011 items 1 and 7: a keyed write returns the stored result on replay, and the
 * effect and its idempotency record commit together (API-CONVENTIONS section 7).
 *
 * The port is a reservation rather than a plain lookup: `reserve` claims the key in its
 * own transaction so a duplicate in flight can be answered with `request_in_progress`,
 * `commit` writes the stored result through the effect's transaction, and a failed
 * attempt releases the claim because only 2xx responses are stored.
 */
import { config } from "./config";
import type { Database, Queryable } from "./db";
import { AppError } from "./errors";

/** `response_status` of a claimed but unfinished key; no HTTP status is below 100. */
export const RESERVED_STATUS = 0;

export interface IdempotencyRecord {
  userId: string;
  scope: string;
  key: string;
  requestHash: string;
  status: number;
  body: unknown;
}

export interface IdempotencyReservationRequest {
  userId: string;
  scope: string;
  key: string;
  requestHash: string;
  /** Retention of the stored result (R8). */
  retentionDays: number;
  /** How long the claim blocks a duplicate before the key counts as abandoned. */
  reservationSeconds: number;
}

export type IdempotencyReservation =
  | { kind: "proceed" }
  | { kind: "replay"; status: number; body: unknown }
  /** Same key, different request hash: 409 `idempotency_key_reused`. */
  | { kind: "reused" }
  /** Same key, first attempt still running: 409 `request_in_progress`. */
  | { kind: "in_progress" };

export interface IdempotencyStore {
  reserve(input: IdempotencyReservationRequest): Promise<IdempotencyReservation>;
  commit(
    tx: Queryable,
    input: {
      userId: string;
      scope: string;
      key: string;
      status: number;
      body: unknown;
      retentionDays: number;
    },
  ): Promise<void>;
  release(input: { userId: string; scope: string; key: string }): Promise<void>;
}

/** Stable, order-insensitive hash of a request payload. */
export async function hashRequest(payload: unknown): Promise<string> {
  const canonical = canonicalJson(payload);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function canonicalJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalise = (input: unknown): unknown => {
    if (input === null || typeof input !== "object") return input;
    if (seen.has(input as object)) throw new TypeError("Idempotent payload must be acyclic");
    seen.add(input as object);
    if (Array.isArray(input)) return input.map(normalise);
    if (input instanceof Date) return input.toISOString();
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(input as Record<string, unknown>).sort()) {
      sorted[key] = normalise((input as Record<string, unknown>)[key]);
    }
    return sorted;
  };
  return JSON.stringify(normalise(value));
}

export interface RunIdempotentOptions<T> {
  database: Database;
  store: IdempotencyStore;
  userId: string;
  scope: string;
  key: string;
  /** Hashed to the request hash; callers pass method, path and body. */
  payload: unknown;
  retentionDays?: number;
  /** Runs inside the effect's transaction and must write the effect there. */
  run: (tx: Queryable) => Promise<{ status: number; body: T }>;
}

/**
 * Executes `run` once per (user, scope, key). A replay with the same payload returns the
 * stored result without invoking `run`.
 */
export async function runIdempotent<T>(
  options: RunIdempotentOptions<T>,
): Promise<{ status: number; body: T; replayed: boolean }> {
  const { database, store, userId, scope, key, payload, run } = options;
  if (key.trim() === "") throw new Error("Idempotency key must not be empty");
  const retentionDays = options.retentionDays ?? config.idempotency.retentionDays;

  const requestHash = await hashRequest(payload);
  const reservation = await store.reserve({
    userId,
    scope,
    key,
    requestHash,
    retentionDays,
    reservationSeconds: config.idempotency.reservationSeconds,
  });

  if (reservation.kind === "in_progress") {
    throw new AppError("request_in_progress", { retryAfter: 1 });
  }
  if (reservation.kind === "reused") throw new AppError("idempotency_key_reused");
  if (reservation.kind === "replay") {
    return { status: reservation.status, body: reservation.body as T, replayed: true };
  }

  try {
    const result = await database.transaction(async (tx) => {
      const outcome = await run(tx);
      await store.commit(tx, {
        userId,
        scope,
        key,
        status: outcome.status,
        body: outcome.body,
        retentionDays,
      });
      return outcome;
    });
    return { ...result, replayed: false };
  } catch (error) {
    await store.release({ userId, scope, key });
    throw error;
  }
}

/** Test double: same rules as the relational store, in process memory. */
export function createMemoryIdempotencyStore(): IdempotencyStore {
  const records = new Map<string, IdempotencyRecord>();
  const id = (userId: string, scope: string, key: string) => `${userId}\u0000${scope}\u0000${key}`;
  return {
    async reserve(input) {
      const existing = records.get(id(input.userId, input.scope, input.key));
      if (existing === undefined) {
        records.set(id(input.userId, input.scope, input.key), {
          userId: input.userId,
          scope: input.scope,
          key: input.key,
          requestHash: input.requestHash,
          status: RESERVED_STATUS,
          body: null,
        });
        return { kind: "proceed" };
      }
      if (existing.status === RESERVED_STATUS) return { kind: "in_progress" };
      if (existing.requestHash !== input.requestHash) return { kind: "reused" };
      return { kind: "replay", status: existing.status, body: existing.body };
    },
    async commit(_tx, input) {
      records.set(id(input.userId, input.scope, input.key), {
        userId: input.userId,
        scope: input.scope,
        key: input.key,
        requestHash: records.get(id(input.userId, input.scope, input.key))?.requestHash ?? "",
        status: input.status,
        body: input.body,
      });
    },
    async release(input) {
      records.delete(id(input.userId, input.scope, input.key));
    },
  };
}

/**
 * Relational adapter over `idempotency_keys` (DATA-DICTIONARY section 17). An abandoned
 * claim is reclaimed once its `expires_at` has passed; a claimed key is committed in the
 * same transaction as the effect it produced.
 */
export function createPostgresIdempotencyStore(database: Database): IdempotencyStore {
  return {
    async reserve(input) {
      return database.transaction(async (tx) => {
        await tx.query(
          `DELETE FROM idempotency_keys
           WHERE user_id = $1 AND scope = $2 AND key = $3 AND expires_at <= now()`,
          [input.userId, input.scope, input.key],
        );
        const expiresAt = new Date(Date.now() + input.reservationSeconds * 1000);
        const claimed = await tx.query<{ key: string }>(
          `INSERT INTO idempotency_keys
             (user_id, scope, key, request_hash, response_status, response_body, expires_at)
           VALUES ($1, $2, $3, $4, $5, NULL, $6)
           ON CONFLICT (user_id, scope, key) DO NOTHING
           RETURNING key`,
          [input.userId, input.scope, input.key, input.requestHash, RESERVED_STATUS, expiresAt],
        );
        if (claimed.length > 0) return { kind: "proceed" } as const;

        const rows = await tx.query<{
          request_hash: string;
          response_status: number;
          response_body: unknown;
        }>(
          `SELECT request_hash, response_status, response_body
           FROM idempotency_keys WHERE user_id = $1 AND scope = $2 AND key = $3`,
          [input.userId, input.scope, input.key],
        );
        const row = rows[0];
        if (row === undefined) return { kind: "proceed" } as const;
        if (row.response_status === RESERVED_STATUS) return { kind: "in_progress" } as const;
        if (row.request_hash !== input.requestHash) return { kind: "reused" } as const;
        return { kind: "replay", status: row.response_status, body: row.response_body } as const;
      });
    },

    async commit(tx, input) {
      await tx.query(
        `UPDATE idempotency_keys
         SET response_status = $4, response_body = $5::jsonb, expires_at = $6
         WHERE user_id = $1 AND scope = $2 AND key = $3`,
        [
          input.userId,
          input.scope,
          input.key,
          input.status,
          JSON.stringify(input.body ?? null),
          new Date(Date.now() + input.retentionDays * 24 * 60 * 60 * 1000),
        ],
      );
    },

    async release(input) {
      await database.query(
        `DELETE FROM idempotency_keys
         WHERE user_id = $1 AND scope = $2 AND key = $3 AND response_status = $4`,
        [input.userId, input.scope, input.key, RESERVED_STATUS],
      );
    },
  };
}
