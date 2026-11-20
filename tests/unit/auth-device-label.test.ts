import { describe, expect, it } from "vitest";

import { deviceLabel } from "@/modules/auth/service";

describe("sign-in device labels (PU-5)", () => {
  it("names the browser and the platform of the current user agents", () => {
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome on Windows");
    expect(
      deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"),
    ).toBe("Safari on macOS");
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/133.0")).toBe("Firefox on Windows");
    expect(
      deviceLabel("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile"),
    ).toBe("Chrome on Android");
  });

  it("prefers the Edge and Firefox families over the Chrome token they carry", () => {
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0")).toBe(
      "Edge on Windows",
    );
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) FxiOS/133.0")).toBe("Firefox on iPhone");
  });

  it("falls back to a neutral label rather than an empty one", () => {
    expect(deviceLabel(null)).toBe("Unknown device");
    expect(deviceLabel("   ")).toBe("Unknown device");
    expect(deviceLabel("curl/8.5.0")).toBe("Browser on Unknown platform");
  });
});
