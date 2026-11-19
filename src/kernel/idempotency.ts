/**
 * ADR-011 items 1 and 7: a keyed write returns the stored result on replay, and the
 * effect and its idempotency record commit together.
 *
 * The relational adapter lands with the table in M02 (B-06 moved `idempotency_keys`
 * out of M01). M01 ships the contract and an in-memory store so the replay rule is
 * testable now and every module adopts one implementation.
 */

export interface IdempotencyRecord {
  userId: string;
  scope: string;
  key: string;
  requestHash: string;
  status: number;
  body: unknown;
}

export interface IdempotencyStore {
  /** Returns the stored record, or `undefined` when the key is unseen or expired. */
  find(userId: string, scope: string, key: string): Promise<IdempotencyRecord | undefined>;
  save(record: IdempotencyRecord): Promise<void>;
}

export class IdempotencyKeyReuseError extends Error {
  readonly scope: string;
  constructor(scope: string) {
    super(`Idempotency key reused with a different payload for scope "${scope}"`);
    this.name = "IdempotencyKeyReuseError";
    this.scope = scope;
  }
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
  store: IdempotencyStore;
  userId: string;
  scope: string;
  key: string;
  payload: unknown;
  run: () => Promise<{ status: number; body: T }>;
}

/**
 * Executes `run` once per (user, scope, key). A replay with the same payload returns
 * the stored result without invoking `run`. The same key with a different payload is a
 * programming error and throws `IdempotencyKeyReuseError`.
 *
 * The caller must ensure `run` writes its effect and the record in one transaction
 * once the relational store exists (ADR-011 item 7).
 */
export async function runIdempotent<T>(
  options: RunIdempotentOptions<T>,
): Promise<{ status: number; body: T; replayed: boolean }> {
  const { store, userId, scope, key, payload, run } = options;
  if (key.trim() === "") throw new Error("Idempotency key must not be empty");

  const requestHash = await hashRequest(payload);
  const existing = await store.find(userId, scope, key);
  if (existing !== undefined) {
    if (existing.requestHash !== requestHash) throw new IdempotencyKeyReuseError(scope);
    return { status: existing.status, body: existing.body as T, replayed: true };
  }

  const result = await run();
  await store.save({
    userId,
    scope,
    key,
    requestHash,
    status: result.status,
    body: result.body,
  });
  return { ...result, replayed: false };
}

export function createMemoryIdempotencyStore(): IdempotencyStore {
  const records = new Map<string, IdempotencyRecord>();
  const id = (userId: string, scope: string, key: string) => `${userId}\u0000${scope}\u0000${key}`;
  return {
    async find(userId, scope, key) {
      return records.get(id(userId, scope, key));
    },
    async save(record) {
      records.set(id(record.userId, record.scope, record.key), record);
    },
  };
}