import { describe, expect, it } from "vitest";

import { elapsedMinutes, localDateOf, localDayRange, toUtcIso } from "@/kernel/time";

describe("time module (ADR-006)", () => {
  it("derives the local date in the user's zone", () => {
    // 2026-03-08T03:30Z is still 2026-03-07 in New York (EST, UTC-5).
    expect(localDateOf(new Date("2026-03-08T03:30:00Z"), "America/New_York")).toBe("2026-03-07");
    expect(localDateOf(new Date("2026-03-08T03:30:00Z"), "Asia/Tokyo")).toBe("2026-03-08");
  });

  it("applies the rollover hour (BR-014)", () => {
    // 04:30 local with a 04:00 rollover belongs to the new study day.
    const instant = new Date("2026-05-11T08:30:00Z"); // 04:30 in New York
    expect(localDateOf(instant, "America/New_York", 4)).toBe("2026-05-11");
    expect(localDateOf(instant, "America/New_York", 5)).toBe("2026-05-10");
  });

  it("returns a 23-hour day on spring-forward and 25 hours on fall-back", () => {
    const spring = localDayRange("2026-03-08", "America/New_York");
    const autumn = localDayRange("2026-11-01", "America/New_York");
    expect((spring.end.getTime() - spring.start.getTime()) / 3_600_000).toBe(23);
    expect((autumn.end.getTime() - autumn.start.getTime()) / 3_600_000).toBe(25);
  });

  it("starts the day at the rollover hour in UTC terms", () => {
    const { start } = localDayRange("2026-05-11", "America/New_York", 4);
    expect(toUtcIso(start)).toBe("2026-05-11T08:00:00.000Z");
  });

  it("counts whole minutes from timestamps, never negative (BR-012)", () => {
    expect(elapsedMinutes(new Date("2026-01-01T10:00:00Z"), new Date("2026-01-01T10:25:59Z"))).toBe(25);
    expect(elapsedMinutes(new Date("2026-01-01T10:25:00Z"), new Date("2026-01-01T10:00:00Z"))).toBe(0);
  });

  it("rejects an unknown zone instead of silently using UTC", () => {
    expect(() => localDateOf(new Date(), "Mars/Olympus")).toThrow(RangeError);
  });
});