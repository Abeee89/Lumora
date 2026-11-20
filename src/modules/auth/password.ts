/**
 * NFR-011: salted adaptive hash, never reversible. `node:crypto` scrypt with a 16 byte
 * salt and a 64 byte key; the stored format is `saltHex:hashHex`, 161 characters, the
 * shape M00 observed in the Better Auth path.
 *
 * Verification is constant time and does not reveal whether the user exists: callers
 * compare against a dummy hash when no credential row is present.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  const { promise, resolve, reject } = Promise.withResolvers<Buffer>();
  scryptCallback(password, salt, KEY_BYTES, SCRYPT, (error, key) => {
    if (error !== null) reject(error);
    else resolve(key);
  });
  return promise;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const separator = stored.indexOf(":");
  if (separator === -1) return false;
  const salt = Buffer.from(stored.slice(0, separator), "hex");
  const expected = Buffer.from(stored.slice(separator + 1), "hex");
  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;
  const actual = await derive(password, salt);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const DUMMY_HASH =
  "00000000000000000000000000000000:" +
  "0".repeat(KEY_BYTES * 2);

/** Burns the same work as a real check so a missing account is not faster. */
export async function verifyAgainstNothing(password: string): Promise<false> {
  await verifyPassword(password, DUMMY_HASH);
  return false;
}

export function passwordMeetsRule(password: string, minimum: number): boolean {
  return password.length >= minimum;
}