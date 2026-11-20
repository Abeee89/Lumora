"use client";

import { useState } from "react";

import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ErrorPanel, FormFields, TextLink } from "../control";
import { messageFor, passwordHint, passwordMinLength } from "../messages";
import { PasswordField } from "../password-field";

/** PU-5. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const invalidToken = failure?.code === "reset_token_invalid";

  const submit = async () => {
    if (password.length < passwordMinLength) {
      setError(`Use at least ${passwordMinLength} characters.`);
      return;
    }
    setError(null);
    setFailure(null);
    setPending(true);
    const result = await apiRequest<unknown>("/api/app/auth/password-reset/complete", {
      method: "POST",
      body: { token, newPassword: password },
    });
    setPending(false);

    if (result.ok) {
      setDone(true);
      return;
    }
    if (result.failure.code === "password_too_short") {
      setError(`Use at least ${passwordMinLength} characters.`);
      return;
    }
    setFailure(result.failure);
  };

  if (invalidToken) {
    return (
      <ErrorPanel
        title="This reset link is invalid or has expired."
        body="Request a new link and open it in this browser."
        requestId={failure?.requestId}
        action={
          <TextLink className="inline-flex min-h-11 items-center" href="/forgot-password">
            Request a new link
          </TextLink>
        }
      />
    );
  }

  if (done) {
    return (
      <div role="status" className="rounded-card border border-line bg-primary-soft p-5 text-on-primary-soft">
        <p>Your password has been changed. Log in with the new password.</p>
        <p className="mt-3 text-sm">
          <TextLink href="/login" className="text-on-primary-soft">
            Log in
          </TextLink>
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      {failure !== null && (
        <ErrorPanel
          title="We could not save the new password"
          body={messageFor(failure.code, failure.message)}
          requestId={failure.requestId}
        />
      )}

      <FormFields>
        <PasswordField
          id="field-newPassword"
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={passwordHint}
          error={error}
        />
      </FormFields>

      <Button type="submit" pending={pending} wide>
        Save new password
      </Button>
    </form>
  );
}