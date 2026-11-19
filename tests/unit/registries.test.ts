import { describe, expect, it } from "vitest";

import { archiveGuards, createRegistry, exportContributors, purgeHandlers } from "@/kernel/registries";

describe("inversion registries (MODULE-BOUNDARIES section 3)", () => {
  it("rejects a duplicate registration instead of silently replacing", () => {
    const registry = createRegistry<() => void>("purge handler");
    registry.register("sessions", () => undefined);
    expect(() => registry.register("sessions", () => undefined)).toThrow(/duplicate/);
  });

  it("rejects an empty key", () => {
    const registry = createRegistry<string>("archive guard");
    expect(() => registry.register("  ", "x")).toThrow(/empty/);
  });

  it("ships the three registries empty in M01", () => {
    expect(purgeHandlers.keys()).toEqual([]);
    expect(exportContributors.keys()).toEqual([]);
    expect(archiveGuards.keys()).toEqual([]);
  });
});