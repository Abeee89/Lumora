import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentSession } from "@/server/session";
import { ForgotPasswordForm } from "@/ui/forms/forgot-password-form";

export const metadata: Metadata = { title: "Reset your password · Lumora" };

/** PU-4. */
export default async function ForgotPasswordPage() {
  const session = await currentSession();
  if (session !== null) redirect("/settings/profile");

  return (
    <div className="mx-auto max-w-[440px] space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Reset your password
      </h1>
      <p className="text-ink-2">
        Enter the email address of your account and we will send a link to set a new password.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}