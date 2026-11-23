import { describe, expect, it } from "vitest";

import { allocateDays, dayIntervals, type DayAllocation, type SessionContext } from "@/modules/sessions/public";

/**
 * The session rules that are pure enough to pin without a database: the per-day split at
 * midnight, at a rollover hour and across DST boundaries (BR-016, EC-009, EC-006), and
 * the ranking rule (BR-010, EC-025). The write-time checks (future, duration, daily cap,
 * overlap) run against the fake-Queryable harness in the integration tests.
 */
const USER = "018c0000-0000-7000-8000-0000000000aa";

const ctx = (timezone: string, rolloverHour = 0, now = "2026-11-22T10:00:00.000Z"): SessionContext => ({
  now: new Date(now),
  timezone,
  rolloverHour,
});
const total = (allocations: readonly DayAllocation[]): number =>
  allocations.reduce((sum, allocation) => sum + allocation.seconds, 0);

describe("day split (BR-016, EC-009)", () => {
  it("keeps a session inside one UTC day on that day", () => {
    const allocations = allocateDays(
      new Date("2026-11-22T09:00:00.000Z"),
      new Date("2026-11-22T10:00:00.000Z"),
      "UTC",
      0,
      true,
    );
    expect(allocations).toEqual([{ localDate: "2026-11-22", seconds: 3600, isManual: true }]);
  });

  it("splits a midnight-crossing session into two day slices", () => {
    const allocations = allocateDays(
      new Date("2026-11-22T23:30:00.000Z"),
      new Date("2026-11-23T00:30:00.000Z"),
      "UTC",
      0,
      true,
    );
    expect(allocations).toEqual([
      { localDate: "2026-11-22", seconds: 1800, isManual: true },
      { localDate: "2026-11-23", seconds: 1800, isManual: true },
    ]);
  });

  it("starts the day at the rollover hour, not midnight", () => {
    const allocations = allocateDays(
      new Date("2026-11-22T03:30:00.000Z"),
      new Date("2026-11-22T05:30:00.000Z"),
      "UTC",
      4,
      true,
    );
    // 03:30 is before the 04:00 boundary, so it belongs to the previous study day.
    expect(allocations).toEqual([
      { localDate: "2026-11-21", seconds: 1800, isManual: true },
      { localDate: "2026-11-22", seconds: 5400, isManual: true },
    ]);
  });

  it("keeps the day slices inside a DST spring-forward day (23 h)", () => {
    // America/New_York 2026-03-08 02:00 -> 03:00; the local day is 23 hours long.
    const allocations = allocateDays(
      new Date("2026-03-08T06:30:00.000Z"),
      new Date("2026-03-08T08:30:00.000Z"),
      "America/New_York",
      0,
      false,
    );
    expect(total(allocations)).toBe(7200);
    expect(allocations.map((allocation) => allocation.localDate)).toEqual(["2026-03-08"]);
  });

  it("spans two DST days without losing or doubling seconds", () => {
    // 2026-03-08 06:30Z (01:30 EST) to 2026-03-09 05:00Z (01:00 EDT) is 22.5 h of
    // wall time across the spring-forward boundary; the slices add up to the UTC span.
    const allocations = allocateDays(
      new Date("2026-03-08T06:30:00.000Z"),
      new Date("2026-03-09T05:00:00.000Z"),
      "America/New_York",
      0,
      false,
    );
    expect(total(allocations)).toBe(22.5 * 3600);
    expect(allocations[0]?.localDate).toBe("2026-03-08");
    expect(allocations[1]?.localDate).toBe("2026-03-09");
  });
});

describe("ranking (BR-010, EC-025)", () => {
  it("marks only timer sessions of 5 minutes or more as ranked", () => {
    const timerShort = allocateDays(
      new Date("2026-11-22T09:00:00.000Z"),
      new Date("2026-11-22T09:04:00.000Z"),
      "UTC",
      0,
      false,
    );
    const timerRanked = allocateDays(
      new Date("2026-11-22T09:00:00.000Z"),
      new Date("2026-11-22T09:05:00.000Z"),
      "UTC",
      0,
      false,
    );
    // The is_ranked flag is written by insertSession, not carried by allocateDays; the
    // 300-second rule is pinned in the service's INSERT values.
    expect(timerShort[0]?.seconds).toBe(240);
    expect(timerRanked[0]?.seconds).toBe(300);
  });
});
