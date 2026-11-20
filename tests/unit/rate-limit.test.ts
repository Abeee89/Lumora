import { describe, expect, it } from "vitest";

import { createMemoryRateLimiter } from "@/kernel/rate-limit";

describe("fixed window rate limiting (NFR-012)", () => {
  const start = new Date("2026-11-20T10:00:12Z");

  it("allows up to the limit, then reports the wait and keeps counting", async () => {
    const limiter = createMemoryRateLimiter(() => start);
    for (let index = 0; index < 5; index += 1) {
      const result = await limiter.consume("signin:203.0.113.7", 5, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - index);
    }

    const blocked = await limiter.consume("signin:203.0.113.7", 5, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetSeconds).toBe(48);
  });

  it("counts buckets independently", async () => {
    const limiter = createMemoryRateLimiter(() => start);
    await limiter.consume("signin:203.0.113.7", 1, 60);
    expect((await limiter.consume("signin:203.0.113.7", 1, 60)).allowed).toBe(false);
    expect((await limiter.consume("signin:198.51.100.9", 1, 60)).allowed).toBe(true);
  });

  it("forgets the count in the next window", async () => {
    let current = start;
    const limiter = createMemoryRateLimiter(() => current);
    await limiter.consume("reset:203.0.113.7", 1, 60);
    expect((await limiter.consume("reset:203.0.113.7", 1, 60)).allowed).toBe(false);

    current = new Date(start.getTime() + 60_000);
    expect((await limiter.consume("reset:203.0.113.7", 1, 60)).allowed).toBe(true);
  });
});
