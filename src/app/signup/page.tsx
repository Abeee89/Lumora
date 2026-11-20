import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentSession } from "@/server/session";
import { SignUpForm } from "@/ui/forms/sign-up-form";

export const metadata: Metadata = { title: "Create your account · Lumora" };

/** PU-2. */
export default async function SignUpPage() {
  const session = await currentSession();
  if (session !== null) redirect("/settings/profile");

  return (
    <div className="mx-auto max-w-[440px] space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Create your account
      </h1>
      <SignUpForm />
    </div>
  );
}