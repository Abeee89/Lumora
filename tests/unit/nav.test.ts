import { describe, expect, it } from "vitest";

import { primaryNav, visibleNav } from "@/ui/nav";

describe("navigation (NAVIGATION-STRUCTURE section 2)", () => {
  it("renders nothing until a route is shipped", () => {
    expect(visibleNav(primaryNav, {})).toEqual([]);
  });

  it("keeps the documented order when routes ship", () => {
    const shipped = { "/dashboard": true, "/timer": true } as const;
    expect(visibleNav(primaryNav, shipped).map((item) => item.label)).toEqual(["Dashboard", "Timer"]);
  });

  it("never renders an item whose route is missing", () => {
    const labels = visibleNav(primaryNav, { "/notes": true }).map((item) => item.label);
    expect(labels).toEqual(["Notes"]);
  });
});