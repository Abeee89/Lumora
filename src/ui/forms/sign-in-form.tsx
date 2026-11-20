"use client";

import { useEffect, useState } from "react";

import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ButtonLink, ErrorPanel, FieldError, FormFields, Label, Panel, TextInput, TextLink, formId } from "../control";
import { messageFor } from "../messages";
import { PasswordField } from "../password-field";

const STARTED = "/settings/profile";

const noticeCopy: Readonly<Record<string, { tone: "info" | "error"; text: string }>> = {
  expired: { tone: "info", text: "Your session ended. Log in to continue." },
  revoked: { tone: "info", text: "Your session ended. Log in to continue." },
  age: { tone: "info", text: "Confirm your age and time zone to finish creating your account." },
  google: { tone: "error", text: "Google sign-in did not finish. Try again." },
  signedout: { tone: "info", text: "You are signed out." },
  unavailable: {
    tone: "error",
    text: "Google sign-in is not available right now. Use your email and password.",
  },
};

/** PU-3. */
export function SignInForm({ notice }: { notice?: string | undefined }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // The lock text updates on submit and once a minute, never every second (PU-3).
  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const locked = lockedUntil !== null && lockedUntil > now;
  const lockedMinutes = lockedUntil === null ? 0 : Math.max(1, Math.ceil((lockedUntil - now) / 60_000));
  const banner = notice === undefined ? undefined : noticeCopy[notice];

  const submit = async () => {
    if (email.trim() === "" || password === "") {
      setFieldError(email.trim() === "" ? "Enter your email address." : "Enter your password.");
      return;
    }
    setFieldError(null);
    setFailure(null);
    setPending(true);
    const result = await apiRequest<{ userId: string }>("/api/app/auth/sign-in", {
      method: "POST",
      body: { email: email.trim(), password },
    });
    setPending(false);

    if (result.ok) {
      window.location.assign(STARTED);
      return;
    }
    if (result.failure.code === "account_locked") {
      const seconds = result.failure.retryAfterSeconds ?? 900;
      setNow(Date.now());
      setLockedUntil(Date.now() + seconds * 1000);
      return;
    }
    setFailure(result.failure);
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      {banner !== undefined &&
        (banner.tone === "info" ? (
          <div role="alert" className="rounded-card border border-line bg-primary-soft p-4 text-sm text-on-primary-soft">
            {banner.text}{" "}
            {notice === "age" && <TextLink href="/welcome">Confirm a few details</TextLink>}
          </div>
        ) : (
          <ErrorPanel title="Sign-in with Google" body={banner.text} />
        ))}

      {locked && (
        <Panel tone="error">
          <p role="alert" className="text-sm font-semibold text-ink">
            Too many attempts. Try again in {lockedMinutes} {lockedMinutes === 1 ? "minute" : "minutes"}.
          </p>
        </Panel>
      )}

      {failure !== null && failure.code !== "invalid_credentials" && (
        <ErrorPanel
          title={failure.code === "rate_limited" ? "Too many attempts" : "We could not sign you in"}
          body={messageFor(failure.code, failure.message)}
          requestId={failure.requestId}
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
            describedBy={fieldError === null ? undefined : "signin-error"}
          />
        </div>

        <PasswordField
          id={formId("password")}
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={fieldError}
        />
      </FormFields>

      {failure !== null && failure.code === "invalid_credentials" && (
        <FieldError id="signin-error">{messageFor("invalid_credentials")}</FieldError>
      )}

      <div className="space-y-4">
        <Button type="submit" pending={pending} disabled={locked} wide>
          Log in
        </Button>

        <p className="flex items-center gap-3 text-sm text-muted">
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          or
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </p>

        <ButtonLink
          href={`/api/app/auth/google?ageConfirmed=false&timezone=${encodeURIComponent("UTC")}&next=${encodeURIComponent(STARTED)}`}
          variant="secondary"
          wide
        >
          Continue with Google
        </ButtonLink>
      </div>

      <p className="text-sm text-muted">
        <TextLink href="/forgot-password">Forgot password</TextLink>
        {" · "}
        <TextLink href="/signup">Create account</TextLink>
      </p>
    </form>
  );
}