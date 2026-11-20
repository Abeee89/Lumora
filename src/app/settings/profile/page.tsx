import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getProfile } from "@/modules/profile/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import { ProfileForm } from "@/ui/forms/profile-form";

export const metadata: Metadata = { title: "Profile · Lumora" };

/** A-15 Profile section (FR-006, FR-009). */
export default async function ProfileSettingsPage() {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const profile = await getProfile(container().database, session.userId);

  return (
    <div className="space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Profile
      </h1>
      <p className="text-ink-2">
        Signed in as <span className="font-semibold text-ink">{profile.email}</span>.
      </p>
      <ProfileForm
        initial={{
          displayName: profile.displayName,
          timezone: profile.timezone,
          rolloverHour: profile.rolloverHour,
          version: profile.version,
        }}
      />
    </div>
  );
}