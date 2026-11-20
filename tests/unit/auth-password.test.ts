import { describe, expect, it } from "vitest";

import { hashPassword, passwordMeetsRule, verifyAgainstNothing, verifyPassword } from "@/modules/auth/password";

describe("password hashing (NFR-011)", () => {
  it("verifies the password it hashed and refuses another", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batteru", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("stores salt and key, never the password, and salts every hash separately", async () => {
    const first = await hashPassword("same-password");
    const second = await hashPassword("same-password");
    expect(first).not.toContain("same-password");
    expect(first).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(first).not.toBe(second);
    expect(await verifyPassword("same-password", first)).toBe(true);
    expect(await verifyPassword("same-password", second)).toBe(true);
  });

  it("refuses a malformed stored value instead of throwing", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
    expect(await verifyPassword("anything", "abcd:ef")).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
  });

  it("never verifies the dummy hash used for unknown accounts", async () => {
    expect(await verifyAgainstNothing("anything")).toBe(false);
  });

  it("enforces the configured minimum length", () => {
    expect(passwordMeetsRule("12345678", 8)).toBe(true);
    expect(passwordMeetsRule("1234567", 8)).toBe(false);
    expect(passwordMeetsRule("", 1)).toBe(false);
  });
});
