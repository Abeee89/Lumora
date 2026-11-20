import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentSession } from "@/server/session";
import { SignInList } from "@/ui/forms/sign-in-list";

export const metadata: Metadata = { title: "Security · Lumora" };

/** A-15 Security section (FR-008). */
export default async function SecuritySettingsPage() {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  return (
    <div className="space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Security
      </h1>
      <p className="text-ink-2">Devices signed in to your account. Revoke any you do not recognise.</p>
      <SignInList />
    </div>
  );
}