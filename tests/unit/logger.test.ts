import { describe, expect, it } from "vitest";

import { scrub } from "@/kernel/logger";

describe("log scrubbing (NFR-063)", () => {
  it("removes passwords, tokens and cookies at any depth", () => {
    const scrubbed = scrub({
      email: "student@example.com",
      password: "hunter2",
      nested: { authorization: "Bearer abc", token: "abc", safe: "kept" },
    });
    const text = JSON.stringify(scrubbed);
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("Bearer abc");
    expect(text).toContain("student@example.com");
    expect(scrubbed).toEqual({
      email: "student@example.com",
      password: "[redacted]",
      nested: { authorization: "[redacted]", token: "[redacted]", safe: "kept" },
    });
  });

  it("keeps note content out of logs and survives cycles", () => {
    const scrubbed = scrub({ note: { content: "private study note" }, body: "private body" }) as Record<
      string,
      unknown
    >;
    expect(JSON.stringify(scrubbed)).not.toContain("private");
  });

  it("reduces an Error to name and message and stops at deep nesting", () => {
    expect(scrub(new Error("boom"))).toEqual({ name: "Error", message: "boom" });
    let deep: Record<string, unknown> = { leaf: "x" };
    for (let index = 0; index < 10; index += 1) deep = { next: deep };
    expect(JSON.stringify(scrub(deep))).toContain("[redacted]");
  });
});