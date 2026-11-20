import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import * as auth from "@/modules/auth/public";
import { container } from "@/server/container";
import { WelcomeForm } from "@/ui/forms/welcome-form";

export const metadata: Metadata = { title: "Confirm a few details · Lumora" };

/**
 * PU-6. Reached from the Google callback when the age gate was not confirmed yet; the
 * pending cookie carries the verified address and the chosen time zone.
 */
export default async function WelcomePage() {
  const c = container();
  const google = c.google;
  const store = await cookies();
  const pending =
    google === null
      ? null
      : auth.decodePending(google, store.get(auth.GOOGLE_PENDING_COOKIE)?.value, new Date());

  if (pending === null) redirect("/login?notice=google");

  return (
    <div className="mx-auto max-w-[440px] space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Confirm a few details
      </h1>
      <WelcomeForm email={pending.email} timezone={pending.timezone} next={pending.next} />
    </div>
  );
}