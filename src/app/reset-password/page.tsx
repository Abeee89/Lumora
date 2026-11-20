import type { Metadata } from "next";

import { currentSession } from "@/server/session";
import { ErrorPanel } from "@/ui/control";
import { ResetPasswordForm } from "@/ui/forms/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password · Lumora" };

/** PU-5. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await currentSession();

  return (
    <div className="mx-auto max-w-[440px] space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Choose a new password
      </h1>
      {token === undefined || token === "" ? (
        <ErrorPanel
          title="This reset link is invalid or has expired."
          body="Request a new link and open it in this browser."
          action={
            <a className="inline-flex min-h-11 items-center text-primary underline" href="/forgot-password">
              Request a new link
            </a>
          }
        />
      ) : (
        <>
          <ResetPasswordForm token={token} />
          {session !== null && (
            <p className="text-sm text-muted">
              Saving a new password signs out every other device, including this one.
            </p>
          )}
        </>
      )}
    </div>
  );
}