import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentSession } from "@/server/session";
import { SignInForm } from "@/ui/forms/sign-in-form";

export const metadata: Metadata = { title: "Log in · Lumora" };

/** PU-3. */
export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await currentSession();
  if (session !== null) redirect("/settings/profile");

  const { notice } = await searchParams;

  return (
    <div className="mx-auto max-w-[440px] space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Log in
      </h1>
      <SignInForm notice={notice} />
    </div>
  );
}