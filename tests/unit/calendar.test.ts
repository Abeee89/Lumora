import { describe, expect, it } from "vitest";

import { bucketOf, calendarDay, monthGrid } from "@/modules/calendar/public";

/**
 * The pure calendar reads, pinned without a database: the four intensity buckets of
 * AC-FR-060-1, the always-present minute figure, the Monday-first 7x6 grid and the
 * today marker.
 */

describe("bucketOf (AC-FR-060-1)", () => {
  it("maps 0, 45, 90 and 150 minutes to the four buckets", () => {
    expect(bucketOf(0)).toBe("0");
    expect(bucketOf(45)).toBe("1_59");
    expect(bucketOf(90)).toBe("60_119");
    expect(bucketOf(150)).toBe("120_plus");
  });

  it("puts the boundary minutes in the upper bucket", () => {
    expect(bucketOf(1)).toBe("1_59");
    expect(bucketOf(59)).toBe("1_59");
    expect(bucketOf(60)).toBe("60_119");
    expect(bucketOf(119)).toBe("60_119");
    expect(bucketOf(120)).toBe("120_plus");
  });
});

describe("calendarDay", () => {
  it("keeps the minute figure with the bucket so color is never the only carrier (AC-FR-060-2)", () => {
    expect(calendarDay("2026-11-22", 45, "2026-11-22")).toEqual({
      date: "2026-11-22",
      minutes: 45,
      bucket: "1_59",
      isToday: true,
    });
  });

  it("marks only today", () => {
    expect(calendarDay("2026-11-23", 0, "2026-11-22").isToday).toBe(false);
  });
});

describe("monthGrid (decision U-D9)", () => {
  it("builds a 42-slot Monday-first month with the days in their weekday columns", () => {
    // 2026-11-01 is a Sunday, so the month starts at index 6 after six empty slots.
    expect(monthGrid(2026, 11)).toHaveLength(42);
    expect(monthGrid(2026, 11)[0]).toBe("");
    expect(monthGrid(2026, 11)[6]).toBe("2026-11-01");
    expect(monthGrid(2026, 11)[35]).toBe("2026-11-30");
  });

  it("puts the 1st on a Monday when the month starts on one", () => {
    expect(monthGrid(2024, 7)[0]).toBe("2024-07-01");
    expect(monthGrid(2024, 7)[30]).toBe("2024-07-31");
  });

  it("fills February with exactly 42 slots", () => {
    expect(monthGrid(2026, 2).filter(Boolean)).toHaveLength(28);
    expect(monthGrid(2026, 2)).toHaveLength(42);
  });
});
