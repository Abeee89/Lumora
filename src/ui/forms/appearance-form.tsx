"use client";

import { useState } from "react";

import { THEME_COOKIE, THEME_MAX_AGE_SECONDS, themeLabels, type Theme } from "@/ui/theme";

import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ErrorPanel } from "../control";
import { messageFor } from "../messages";

const options: readonly Theme[] = ["light", "dark", "system"];

/** A-15 Appearance section. The change previews immediately and then saves to the profile. */
export function AppearanceForm({ initial, version }: { initial: Theme; version: number }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const [current, setCurrent] = useState(version);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const apply = async (next: Theme) => {
    setTheme(next);
    setAnnouncement(`Theme set to ${themeLabels[next]}`);
    document.documentElement.dataset["theme"] = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_MAX_AGE_SECONDS}; samesite=lax`;

    setPending(true);
    const result = await apiRequest<{ version: number }>("/api/app/profile", {
      method: "PATCH",
      headers: { "if-match": `"${current}"` },
      body: { theme: next },
    });
    setPending(false);

    if (result.ok) {
      setCurrent(result.data.version);
      setFailure(null);
      return;
    }
    // The preview stays applied; the panel reports the failed save and offers a retry.
    setFailure(result.failure);
  };

  const stale = failure?.code === "stale_version";

  return (
    <div className="space-y-5">
      {failure !== null && (
        <ErrorPanel
          title={stale ? "This changed in another tab or device" : "We could not save your theme"}
          body={messageFor(failure.code, failure.message)}
          requestId={failure.requestId}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                if (stale) window.location.reload();
                else void apply(theme);
              }}
            >
              {stale ? "Reload" : "Retry"}
            </Button>
          }
        />
      )}

      <fieldset className="space-y-2" disabled={pending}>
        <legend className="text-sm font-semibold text-ink">Theme</legend>
        {options.map((option) => (
          <label key={option} className="flex min-h-11 w-fit items-center gap-3">
            <input
              id={`theme-${option}`}
              type="radio"
              name="theme"
              value={option}
              checked={theme === option}
              onChange={() => void apply(option)}
              className="pointer-events-none size-6 accent-primary"
            />
            <span className="text-[15px] text-ink">{themeLabels[option]}</span>
          </label>
        ))}
      </fieldset>

      <p role="status" className="text-sm text-ink-2">
        {announcement}
      </p>
    </div>
  );
}