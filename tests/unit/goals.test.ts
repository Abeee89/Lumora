import { describe, expect, it } from "vitest";

import { AppError } from "@/kernel/errors";
import {
  assertTargetMinutes,
  goalMetCrossed,
  isGoalMet,
  percentOf,
  targetForDay,
  type DailyGoal,
} from "@/modules/goals/public";

/**
 * The goal arithmetic, pinned without a database: the effective-date lookup of BR-015
 * (FR-074), the whole-percent figure of FR-072 and the crossing rule that makes GoalMet fire
 * once per day (APPLICATION-FLOWS section 7).
 */
const history: readonly DailyGoal[] = [
  { effectiveFrom: "2026-11-20", targetMinutes: 90 },
  { effectiveFrom: "2026-11-10", targetMinutes: 120 },
  { effectiveFrom: "2026-11-18", targetMinutes: 60 },
];

describe("targetForDay", () => {
  it("takes the last row on or before the day, whatever order the rows arrive in", () => {
    expect(targetForDay(history, "2026-11-20").targetMinutes).toBe(90);
    expect(targetForDay(history, "2026-11-19").targetMinutes).toBe(60);
    expect(targetForDay(history, "2026-11-25").targetMinutes).toBe(90);
  });

  it("keeps the earliest row for a day before the history starts", () => {
    // An account has a row from its registration local date, so this only guards a clock
    // that moved backwards (a timezone change, BR-014) from inventing a target.
    expect(targetForDay(history, "2026-11-01")).toEqual({
      effectiveFrom: "2026-11-01",
      targetMinutes: 120,
    });
  });

  it("answers the configured default for an empty history, without writing one", () => {
    expect(targetForDay([], "2026-11-25")).toEqual({
      effectiveFrom: "2026-11-25",
      targetMinutes: 120,
    });
  });

  it("answers the effective date of the row in force, not the day asked for", () => {
    expect(targetForDay(history, "2026-11-22").effectiveFrom).toBe("2026-11-20");
  });
});

describe("percentOf", () => {
  it("rounds to whole percent, so 30 of 80 minutes reads 38", () => {
    expect(percentOf(30, 80)).toBe(38);
  });

  it("never clamps above 100", () => {
    expect(percentOf(180, 120)).toBe(150);
  });

  it("is 0 before any minute is recorded", () => {
    expect(percentOf(0, 120)).toBe(0);
  });
});

describe("isGoalMet", () => {
  it("is met at exactly the target (AC-FR-073-1)", () => {
    expect(isGoalMet(120, 120)).toBe(true);
  });

  it("is not met one minute short (AC-FR-073-2)", () => {
    expect(isGoalMet(119, 120)).toBe(false);
  });
});

describe("goalMetCrossed", () => {
  it("publishes on the write that reaches the target", () => {
    expect(
      goalMetCrossed({ beforeMinutes: 110, beforeTargetMinutes: 120, minutes: 120, targetMinutes: 120 }),
    ).toBe(true);
  });

  it("does not publish on a later write on an already met day", () => {
    expect(
      goalMetCrossed({ beforeMinutes: 125, beforeTargetMinutes: 120, minutes: 130, targetMinutes: 120 }),
    ).toBe(false);
  });

  it("publishes when a lowered target makes the day met (AC-FR-074-2)", () => {
    expect(
      goalMetCrossed({ beforeMinutes: 45, beforeTargetMinutes: 120, minutes: 45, targetMinutes: 30 }),
    ).toBe(true);
  });

  it("does not publish when a raised target un-meets the day", () => {
    expect(
      goalMetCrossed({ beforeMinutes: 45, beforeTargetMinutes: 30, minutes: 45, targetMinutes: 120 }),
    ).toBe(false);
  });
});

describe("assertTargetMinutes", () => {
  it("accepts the bounds (AC-FR-070-3)", () => {
    expect(assertTargetMinutes(5)).toBe(5);
    expect(assertTargetMinutes(1440)).toBe(1440);
  });

  it.each([4, 1441, 0, -1, 1.5, Number.NaN])("refuses %s with goal_out_of_range", (value) => {
    try {
      assertTargetMinutes(value);
      expect.unreachable("the range must refuse this value");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const refusal = error as AppError;
      expect(refusal.code).toBe("goal_out_of_range");
      expect(refusal.details).toEqual({ min: 5, max: 1440 });
    }
  });
});