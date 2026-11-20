import { describe, expect, it } from "vitest";

import { defaultDisplayName, onboardingSteps, type PrimaryGoal } from "@/modules/profile/service";
import { assertIanaZone } from "@/kernel/time";

describe("profile defaults (PROF-01, PU-4)", () => {
  it("derives a display name from the email local part until the user edits it", () => {
    expect(defaultDisplayName("ada@example.com")).toBe("ada");
    expect(defaultDisplayName("ada.lovelace+study@example.com")).toBe("ada.lovelace+study");
    expect(defaultDisplayName("  grace  @example.com")).toBe("grace");
  });

  it("never returns an empty name", () => {
    expect(defaultDisplayName("@example.com")).toBe("Learner");
    expect(defaultDisplayName("")).toBe("Learner");
  });

  it("caps the derived name at the column width", () => {
    expect(defaultDisplayName(`${"a".repeat(80)}@example.com`)).toHaveLength(50);
  });

  it("orders onboarding as the PU-4 wizard shows it", () => {
    expect(onboardingSteps).toEqual(["primary_goal", "first_subject", "daily_goal_timezone", "first_session"]);
  });

  it("only accepts the three documented primary goals", () => {
    const goals: PrimaryGoal[] = ["exam_prep", "coursework", "self_learning"];
    expect(goals).toHaveLength(3);
  });

  it("rejects time zones the runtime does not know", () => {
    expect(() => assertIanaZone("Europe/Berlin")).not.toThrow();
    expect(() => assertIanaZone("Mars/Olympus")).toThrow();
    expect(() => assertIanaZone("")).toThrow();
  });
});
