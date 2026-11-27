import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor, priorityRank, sortKey } from "@/modules/tasks/public";

/**
 * The pure Tasks helpers, pinned without a database: the FR-095 composite order (priority
 * rank, due date ascending with null last, then creation time, then id), the cursor
 * round-trip and the done/group component the `status=all` list pages with.
 */

describe("priorityRank (BR-031, FR-096)", () => {
  it("ranks high before medium before low", () => {
    expect(priorityRank("high")).toBe(0);
    expect(priorityRank("medium")).toBe(1);
    expect(priorityRank("low")).toBe(2);
  });
});

describe("sortKey (FR-095)", () => {
  const todo = (overrides: Partial<Parameters<typeof sortKey>[0]> = {}) => ({
    priority: "medium" as const,
    dueDate: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    id: "00000000-0000-7000-8000-000000000001",
    ...overrides,
  });

  it("puts a high to-do with no due date before a low to-do due tomorrow (AC-FR-095-1)", () => {
    const high = sortKey(todo({ priority: "high" }));
    const low = sortKey(todo({ priority: "low", dueDate: "2026-11-02" }));
    expect(high < low).toBe(true);
  });

  it("orders the same priority by due date ascending (AC-FR-095-2)", () => {
    const may1 = sortKey(todo({ dueDate: "2026-05-01" }));
    const may3 = sortKey(todo({ dueDate: "2026-05-03" }));
    expect(may1 < may3).toBe(true);
  });

  it("keeps a dated high to-do before a dateless one (AC-FR-095-3)", () => {
    const dated = sortKey(todo({ priority: "high", dueDate: "2026-12-31" }));
    const dateless = sortKey(todo({ priority: "high" }));
    expect(dated < dateless).toBe(true);
  });

  it("breaks ties by creation time, oldest first, then by id (FR-095)", () => {
    const older = sortKey(todo({ createdAt: "2026-11-01T00:00:00.000Z" }));
    const newer = sortKey(todo({ createdAt: "2026-11-02T00:00:00.000Z" }));
    expect(older < newer).toBe(true);
    const sameAgeA = sortKey(todo({ id: "00000000-0000-7000-8000-000000000001" }));
    const sameAgeB = sortKey(todo({ id: "00000000-0000-7000-8000-000000000002" }));
    expect(sameAgeA < sameAgeB).toBe(true);
  });
});

describe("cursor encode/decode (API-CONVENTIONS section 4)", () => {
  const id = "018f0000-0000-7000-8000-000000000001";

  it("round-trips a dated open cursor", () => {
    const cursor = encodeCursor(0, "2026-05-01", 1730000000000, id, false);
    expect(decodeCursor(cursor)).toEqual({
      priorityRank: 0,
      dueDate: "2026-05-01",
      createdAtMs: 1730000000000,
      id,
      done: false,
    });
  });

  it("round-trips a dateless done cursor", () => {
    const cursor = encodeCursor(2, null, 1730000000000, id, true);
    expect(decodeCursor(cursor)).toEqual({
      priorityRank: 2,
      dueDate: null,
      createdAtMs: 1730000000000,
      id,
      done: true,
    });
  });

  it("rejects a tampered or malformed cursor with invalid_cursor", () => {
    const cursor = encodeCursor(0, null, 1730000000000, id, false);
    expect(() => decodeCursor(cursor.slice(0, -4))).toThrowError(/page cursor is invalid/);
    expect(() => decodeCursor(Buffer.from("todo|0||1730000000000|not-a-uuid|0").toString("base64url"))).toThrowError(
      /page cursor is invalid/,
    );
    expect(() => decodeCursor(Buffer.from("todo|3||1730000000000|" + id + "|0").toString("base64url"))).toThrowError(
      /page cursor is invalid/,
    );
    expect(() => decodeCursor("not base64url")).toThrowError(/page cursor is invalid/);
  });
});
