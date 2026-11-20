import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getProfile } from "@/modules/profile/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import { AppearanceForm } from "@/ui/forms/appearance-form";

export const metadata: Metadata = { title: "Appearance · Lumora" };

/** A-15 Appearance section. */
export default async function AppearanceSettingsPage() {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const profile = await getProfile(container().database, session.userId);

  return (
    <div className="space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Appearance
      </h1>
      <p className="text-ink-2">Choose how Lumora looks. System follows your device setting.</p>
      <AppearanceForm initial={profile.theme} version={profile.version} />
    </div>
  );
}