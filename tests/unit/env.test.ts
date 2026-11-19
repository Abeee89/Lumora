import { describe, expect, it } from "vitest";

import { readEnv, requireDatabaseUrl } from "@/kernel/env";

describe("environment contract (NFR-062)", () => {
  it("defaults LOG_LEVEL and NODE_ENV and accepts an absent database url", () => {
    expect(readEnv({})).toEqual({ LOG_LEVEL: "info", NODE_ENV: "development" });
  });

  it("names the offending variable instead of failing silently", () => {
    expect(() => readEnv({ LOG_LEVEL: "chatty" })).toThrow(/LOG_LEVEL/);
    expect(() => readEnv({ DATABASE_URL: "not-a-url" })).toThrow(/DATABASE_URL/);
  });

  it("requires a database url only for entry points that need one", () => {
    const url = "postgresql://lumora@localhost/lumora";
    expect(requireDatabaseUrl(readEnv({ DATABASE_URL: url }))).toBe(url);
    expect(() => requireDatabaseUrl(readEnv({}))).toThrow(/DATABASE_URL is required/);
  });
});