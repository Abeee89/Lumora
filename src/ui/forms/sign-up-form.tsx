"use client";

import { useRef, useState } from "react";
import { apiRequest, type ApiFailure } from "../api-client";
import { browserTimeZone, TimeZoneCombobox, timeZoneError } from "../combobox";
import { Button, ButtonLink, Checkbox, ErrorPanel, FieldError, FormFields, Hint, Label, TextInput, formId } from "../control";
import { messageFor, passwordHint, passwordMinLength } from "../messages";
import { PasswordField } from "../password-field";
import { errorCount, errorsFromFailure, type FieldErrors } from "./feedback";

const STARTED = "/settings/profile";

interface ProfileView {
  displayName: string;
  version: number;
}

function emailError(value: string): string | null {
  if (value.trim() === "") return "Enter your email address.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : "Enter an email address in the form name@example.com.";
}

/** PU-2. */
export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [timezone, setTimezone] = useState(() => browserTimeZone());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sectionFailure, setSectionFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);
  const summary = useRef<HTMLDivElement>(null);

  const check = (field: string): string | null => {
    if (field === "email") return emailError(email);
    if (field === "password") {
      return password.length >= passwordMinLength ? null : `Use at least ${passwordMinLength} characters.`;
    }
    if (field === "ageConfirmed") return ageConfirmed ? null : "Confirm that you are 16 or older.";
    return timeZoneError(timezone);
  };

  const validateOn = (field: string) => {
    const message = check(field);
    setErrors((current) => {
      const next = { ...current };
      if (message === null) delete next[field];
      else next[field] = message;
      return next;
    });
  };

  const submit = async () => {
    const local: FieldErrors = {};
    for (const field of ["email", "password", "ageConfirmed", "timezone"]) {
      const message = check(field);
      if (message !== null) local[field] = message;
    }
    setErrors(local);
    setSectionFailure(null);

    if (Object.keys(local).length >= 4) {
      summary.current?.focus();
      return;
    }
    if (Object.keys(local).length > 0) return;

    setPending(true);
    const result = await apiRequest<ProfileView>("/api/app/auth/sign-up", {
      method: "POST",
      body: { email: email.trim(), password, ageConfirmed, timezone },
    });
    setPending(false);

    if (result.ok) {
      window.location.assign(STARTED);
      return;
    }
    if (result.failure.code === "rate_limited" || result.failure.code === "internal_error") {
      setSectionFailure(result.failure);
      return;
    }
    const mapped = errorsFromFailure(result.failure, {
      ruleText: { min_length: `Use at least ${passwordMinLength} characters.` },
      codeField: {
        duplicate_email: "email",
        password_too_short: "password",
        age_confirmation_required: "ageConfirmed",
        invalid_timezone: "timezone",
      },
    });
    setErrors(mapped);
    if (errorCount(mapped) >= 4) summary.current?.focus();
  };

  const googleHref = `/api/app/auth/google?ageConfirmed=${ageConfirmed ? "true" : "false"}&timezone=${encodeURIComponent(
    timezone,
  )}&next=${encodeURIComponent(STARTED)}`;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      {sectionFailure !== null && (
        <ErrorPanel
          title={sectionFailure.code === "rate_limited" ? "Too many attempts" : "We could not create your account"}
          body={messageFor(sectionFailure.code, sectionFailure.message)}
          requestId={sectionFailure.requestId}
        />
      )}

      {errorCount(errors) >= 4 && (
        <div
          ref={summary}
          role="alert"
          tabIndex={-1}
          className="rounded-card border border-error bg-error-soft p-4"
        >
          <h2 className="text-base font-semibold text-ink">Check these fields</h2>
          <ul className="mt-1 list-disc pl-5 text-sm text-ink-2">
            {Object.keys(errors).map((field) => (
              <li key={field}>
                <a className="text-primary underline" href={`#${formId(field)}`}>
                  {errors[field]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormFields>
        <div className="space-y-1">
          <Label htmlFor={formId("email")}>Email</Label>
          <TextInput
            id={formId("email")}
            type="email"
            value={email}
            onChange={setEmail}
            onBlur={() => validateOn("email")}
            autoComplete="email"
            invalid={errors["email"] !== undefined}
            describedBy={errors["email"] === undefined ? undefined : `${formId("email")}-error`}
          />
          {errors["email"] !== undefined && (
            <FieldError id={`${formId("email")}-error`}>{errors["email"]}</FieldError>
          )}
        </div>

        <PasswordField
          id={formId("password")}
          label="Password"
          value={password}
          onChange={setPassword}
          onBlur={() => validateOn("password")}
          autoComplete="new-password"
          hint={passwordHint}
          countRule={{ minLength: passwordMinLength }}
          error={errors["password"] ?? null}
        />

        <div className="space-y-1">
          <Checkbox
            id={formId("ageConfirmed")}
            checked={ageConfirmed}
            onChange={(value) => {
              setAgeConfirmed(value);
              if (errors["ageConfirmed"] !== undefined) validateOn("ageConfirmed");
            }}
            invalid={errors["ageConfirmed"] !== undefined}
            describedBy={errors["ageConfirmed"] === undefined ? undefined : `${formId("ageConfirmed")}-error`}
          >
            I am 16 or older
          </Checkbox>
          {errors["ageConfirmed"] !== undefined && (
            <FieldError id={`${formId("ageConfirmed")}-error`}>{errors["ageConfirmed"]}</FieldError>
          )}
        </div>

        <TimeZoneCombobox
          id={formId("timezone")}
          label="Time zone"
          value={timezone}
          onChange={setTimezone}
          onBlur={() => validateOn("timezone")}
          error={errors["timezone"] ?? null}
          hint="Your study day and statistics use this time zone."
        />
      </FormFields>

      <div className="space-y-4">
        <Button type="submit" pending={pending} wide>
          Create account
        </Button>

        <p className="flex items-center gap-3 text-sm text-muted">
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          or
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </p>

        <ButtonLink href={googleHref} variant="secondary" wide>
          Continue with Google
        </ButtonLink>
      </div>

      <Hint id={`${formId("signup")}-hint`}>
        Already have an account? <a className="text-primary underline" href="/login">Log in</a>.
      </Hint>
    </form>
  );
}