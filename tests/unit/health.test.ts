import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("SYS-01 GET /api/health (NFR-050)", () => {
  it("answers 200 with status ok and no caching", async () => {
    const response = GET(new Request("http://localhost/api/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("echoes a caller request id so an uptime monitor can correlate logs", () => {
    const response = GET(
      new Request("http://localhost/api/health", { headers: { "x-request-id": "probe-1" } }),
    );
    expect(response.headers.get("x-request-id")).toBe("probe-1");
  });
});