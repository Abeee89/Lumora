import { describe, expect, it } from "vitest";

import { config } from "@/kernel/config";

describe("config (NFR-062)", () => {
  it("holds the documented defaults", () => {
    expect(config.goal.defaultMinutes).toBe(120); // BR-013
    expect(config.session.minimumMinutes).toBe(1); // BR-008
    expect(config.timer.focusMinutes).toBe(25); // BR-009
    expect(config.timer.breakMinutes).toBe(5);
    expect(config.timer.longBreakMinutes).toBe(15);
    expect(config.timer.cyclesBeforeLongBreak).toBe(4);
    expect(config.timer.idleCloseMinutes).toBe(30); // BR-006
    expect(config.auth.passwordMinLength).toBe(10); // NFR-011
    expect(config.auth.lockoutFailureThreshold).toBe(5); // NFR-012
    expect(config.auth.sessionLifetimeDays).toBe(30); // NFR-013
  });

  it("keeps every range ordered", () => {
    expect(config.goal.minMinutes).toBeLessThan(config.goal.defaultMinutes);
    expect(config.goal.defaultMinutes).toBeLessThan(config.goal.maxMinutes);
    expect(config.plan.minDurationMinutes).toBeLessThan(config.plan.maxDurationMinutes);
    expect(config.session.manualMinMinutes).toBeLessThan(config.session.manualMaxMinutes);
  });
});