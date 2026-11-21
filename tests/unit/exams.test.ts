import { describe, expect, it } from "vitest";

import { config } from "@/kernel/config";
import { AppError } from "@/kernel/errors";
import { countdownOf, daysBetween, decodeCursor, encodeCursor } from "@/modules/exams/public";

describe("exam countdown (FR-120, BR-025)", () => {
  it("counts whole calendar days, including the year boundary", () => {
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("never reports negative days for a date today or later", () => {
    const today = "2026-11-21";
    expect(countdownOf("2026-11-21", today)).toEqual({ daysRemaining: 0, isToday: true });
    expect(countdownOf("2026-11-22", today)).toEqual({ daysRemaining: 1, isToday: false });
    expect(countdownOf("2026-12-31", today).daysRemaining).toBeGreaterThan(0);
  });

  it("marks the exam day as Today, not one day", () => {
    const countdown = countdownOf("2026-11-21", "2026-11-21");
    expect(countdown.isToday).toBe(true);
    expect(countdown.daysRemaining).toBe(0);
  });
});

describe("archived cursor (API-CONVENTIONS section 4, EXAM-01)", () => {
  it("round-trips date and id", () => {
    const cursor = encodeCursor("2026-10-01", "018c0000-0000-0000-0000-000000000001");
    expect(decodeCursor(cursor)).toEqual({ date: "2026-10-01", id: "018c0000-0000-0000-0000-000000000001" });
  });

  it("rejects a tampered cursor with invalid_cursor", () => {
    const cursor = encodeCursor("2026-10-01", "018c0000-0000-0000-0000-000000000001");
    expect(() => decodeCursor(`${cursor}x`)).toThrow(AppError);
    expect(() => decodeCursor("bm90LWEtY3Vyc29y")).toThrow(AppError);
  });
});

describe("exam configuration (FR-121, EXAM-01)", () => {
  it("fixes the title bounds and the archived page size", () => {
    expect(config.exams.titleMaxLength).toBe(200);
    expect(config.exams.archivePageSize).toBe(50);
    expect(config.exams.archiveMaxPageSize).toBe(100);
  });

  it("schedules the auto-archive hourly (BACKGROUND-JOBS section 2)", () => {
    expect(config.jobs.examAutoArchiveQueue).toBe("exam_auto_archive");
    expect(config.jobs.examAutoArchiveCron).toBe("0 * * * *");
  });
});
