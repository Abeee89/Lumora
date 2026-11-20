import type { Metadata, Viewport } from "next";

import { currentSession, currentTheme } from "@/server/session";
import { Shell } from "@/ui/shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "Lumora",
  description: "Plan study time, study with a timer, compare planned with actual effort.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * The theme and the session are read here so the first paint already has the right colors
 * and the right header. `data-theme` is set from the appearance cookie; without one the
 * system preference decides through `color-scheme: light dark`.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await currentTheme();
  const session = await currentSession();

  return (
    <html lang="en" data-theme={theme}>
      <body>
        <Shell signedIn={session !== null}>{children}</Shell>
      </body>
    </html>
  );
}