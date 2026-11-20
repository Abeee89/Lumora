import { describe, expect, it } from "vitest";

import { readEnv, requireDatabaseUrl } from "@/kernel/env";

describe("environment contract (NFR-062)", () => {
  it("defaults the optional variables and accepts an absent database url", () => {
    // M02 added TRUSTED_PROXY_HOPS (default 0) and SESSION_COOKIE_SECURE (default false,
    // the documented local-development setting; the platform sets `true` on HTTPS).
    expect(readEnv({})).toEqual({
      LOG_LEVEL: "info",
      NODE_ENV: "development",
      TRUSTED_PROXY_HOPS: 0,
      SESSION_COOKIE_SECURE: false,
    });
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