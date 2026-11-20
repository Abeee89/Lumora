import { describe, expect, it } from "vitest";

import { config } from "@/kernel/config";
import { isSubjectColor, subjectPalette } from "@/modules/subjects/public";
import { normaliseBulkLines, topicStatuses } from "@/modules/topics/public";

describe("subject palette (FR-010, NFR-043)", () => {
  it("offers the ten documented keys, each with a printed label", () => {
    expect(subjectPalette.map((entry) => entry.key)).toEqual([
      "teal",
      "red",
      "blue",
      "brown",
      "violet",
      "green",
      "plum",
      "slate",
      "rust",
      "cyan",
    ]);
    for (const entry of subjectPalette) {
      expect(entry.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("accepts only those keys", () => {
    expect(isSubjectColor("teal")).toBe(true);
    expect(isSubjectColor("cyan")).toBe(true);
    expect(isSubjectColor("purple")).toBe(false);
    expect(isSubjectColor("Teal")).toBe(false);
    expect(isSubjectColor("")).toBe(false);
  });
});

describe("topic bulk parsing (FR-017)", () => {
  it("trims every line and drops the blank ones", () => {
    expect(normaliseBulkLines(["  Fractions ", "", "   ", "\tDecimals\n".trim()])).toEqual({
      lines: ["Fractions", "Decimals"],
      tooLong: [],
    });
  });

  it("keeps repeated lines so the save can create them", () => {
    expect(normaliseBulkLines(["Fractions", "fractions", "Fractions"]).lines).toEqual([
      "Fractions",
      "fractions",
      "Fractions",
    ]);
  });

  it("reports an over-long line once, after trimming", () => {
    const long = "x".repeat(config.topics.nameMaxLength + 1);
    const atLimit = "y".repeat(config.topics.nameMaxLength);
    const result = normaliseBulkLines([`  ${long}  `, long, atLimit]);
    expect(result.tooLong).toEqual([long]);
    expect(result.lines).toContain(atLimit);
  });
});

describe("topic bounds (BR-024)", () => {
  it("fixes the weight range at 1 to 5", () => {
    expect(config.topics.weightMin).toBe(1);
    expect(config.topics.weightMax).toBe(5);
  });

  it("ships the three statuses A-8 prints", () => {
    expect(topicStatuses).toEqual(["not_started", "in_progress", "done"]);
  });
});