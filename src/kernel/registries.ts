/**
 * MODULE-BOUNDARIES.md section 3: lower modules own a contract and higher modules
 * register an implementation at composition time. M01 ships the empty registries;
 * each milestone adds its own entry and the M14 test asserts the coverage.
 */

export type PurgeHandler = (userId: string) => Promise<number>;

export interface ExportSection {
  /** Stable manifest key, for example `study_sessions`. */
  section: string;
  rows: readonly unknown[];
}

export type ExportContributor = (userId: string) => Promise<ExportSection>;

export type ArchiveGuard = (subjectId: string) => Promise<boolean>;

export interface Registry<T> {
  register(key: string, entry: T): void;
  has(key: string): boolean;
  keys(): readonly string[];
  entries(): readonly (readonly [string, T])[];
}

export function createRegistry<T>(what: string): Registry<T> {
  const items = new Map<string, T>();
  return {
    register(key, entry) {
      if (key.trim() === "") throw new Error(`${what}: empty registration key`);
      if (items.has(key)) throw new Error(`${what}: duplicate registration for "${key}"`);
      items.set(key, entry);
    },
    has: (key) => items.has(key),
    keys: () => [...items.keys()],
    entries: () => [...items.entries()],
  };
}

export const purgeHandlers = createRegistry<PurgeHandler>("purge handler");
export const exportContributors = createRegistry<ExportContributor>("export contributor");
export const archiveGuards = createRegistry<ArchiveGuard>("archive guard");