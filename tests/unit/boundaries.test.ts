import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { checkBoundaries } from "../../tools/boundaries";

const fixture = (name: string) =>
  fileURLToPath(new URL(`../fixtures/boundary/${name}`, import.meta.url));

describe("module boundaries (MODULE-BOUNDARIES section 8)", () => {
  it("accepts a lower-rank public import and kernel use", async () => {
    await expect(checkBoundaries(fixture("clean"))).resolves.toEqual([]);
  });

  it("fails an upward import from Timer to Goals", async () => {
    const violations = await checkBoundaries(fixture("upward"));
    expect(
      violations.some(
        (violation) =>
          violation.rule === "upward-import" && violation.imported === "@/modules/goals/public",
      ),
    ).toBe(true);
  });

  it("fails a deep cross-module import", async () => {
    const violations = await checkBoundaries(fixture("upward"));
    expect(
      violations.some(
        (violation) =>
          violation.rule === "deep-import" && violation.imported === "@/modules/sessions/store",
      ),
    ).toBe(true);
  });

  it("fails a kernel import of a module", async () => {
    const violations = await checkBoundaries(fixture("upward"));
    expect(violations.some((violation) => violation.rule === "kernel-imports-module")).toBe(true);
  });

  // The full repo scan parses every source file; under v8 coverage instrumentation that
  // takes longer than the 5 s default, so this test gets its own budget.
  it("passes on this repository", { timeout: 30_000 }, async () => {
    const violations = await checkBoundaries(process.cwd());
    expect(violations).toEqual([]);
  });
});