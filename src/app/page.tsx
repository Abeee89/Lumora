import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentSession } from "@/server/session";
import { ButtonLink } from "@/ui/control";

export const metadata: Metadata = { title: "Lumora" };

/** PU-1. A signed-in visitor goes to the app surface that exists today. */
export default async function EntryPage() {
  const session = await currentSession();
  if (session !== null) redirect("/settings/profile");

  return (
    <div className="mx-auto max-w-[560px] space-y-6">
      <h1 tabIndex={-1} className="text-[32px] font-bold leading-tight text-ink outline-none">
        Plan what you study. Time it. Compare it with the plan.
      </h1>
      <p className="text-lg text-ink-2">
        Lumora records your study sessions and shows your actual hours next to the hours you planned.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/signup" wide>
          Create account
        </ButtonLink>
        <ButtonLink href="/login" variant="secondary" wide>
          Log in
        </ButtonLink>
      </div>
    </div>
  );
}