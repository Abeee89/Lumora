"use client";

import { useRef, useState } from "react";

import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ErrorPanel, FormFields, Label, TextInput, TextLink, formId } from "../control";
import { messageFor } from "../messages";

/** PU-4. The confirmation text is identical for a known and an unknown address (FR-005). */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const confirmation = useRef<HTMLDivElement>(null);

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError("Enter an email address in the form name@example.com.");
      return;
    }
    setFieldError(null);
    setFailure(null);
    setPending(true);
    const result = await apiRequest<unknown>("/api/app/auth/password-reset/request", {
      method: "POST",
      body: { email: email.trim() },
    });
    setPending(false);

    if (result.ok) {
      setSent(true);
      window.setTimeout(() => confirmation.current?.focus(), 0);
      return;
    }
    setFailure(result.failure);
  };

  if (sent) {
    return (
      <div
        ref={confirmation}
        role="status"
        tabIndex={-1}
        className="rounded-card border border-line bg-primary-soft p-5 text-on-primary-soft"
      >
        <p>If an account exists for that address, a reset link is on its way.</p>
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
          title={failure.code === "rate_limited" ? "Too many requests" : "We could not send the link"}
          body={messageFor(failure.code, failure.message)}
          requestId={failure.requestId}
          action={<Button onClick={() => void submit()}>Retry</Button>}
        />
      )}

      <FormFields>
        <div className="space-y-1">
          <Label htmlFor={formId("email")}>Email</Label>
          <TextInput
            id={formId("email")}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            invalid={fieldError !== null}
            describedBy={fieldError === null ? undefined : "forgot-error"}
          />
          {fieldError !== null && (
            <p className="text-sm font-semibold text-error" id="forgot-error">
              {fieldError}
            </p>
          )}
        </div>
      </FormFields>

      <Button type="submit" pending={pending} wide>
        Send reset link
      </Button>

      <p className="flex items-center text-sm text-muted">
        <TextLink className="inline-flex min-h-11 min-w-11 items-center justify-center" href="/login">
          Log in
        </TextLink>
      </p>
    </form>
  );
}