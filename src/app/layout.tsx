import type { Metadata, Viewport } from "next";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}