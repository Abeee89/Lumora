"use client";

import { useState } from "react";

import { TimeZoneCombobox, timeZoneError } from "../combobox";
import { Button, Checkbox, FieldError, FormFields, formId } from "../control";

/**
 * PU-6. The Continue button restarts AUTH-03 with the age confirmation in the signed state,
 * which is what lets the callback create the account.
 */
export function WelcomeForm({
  email,
  timezone,
  next,
}: {
  email: string;
  timezone: string;
  next: string;
}) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [zone, setZone] = useState(timezone);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const submit = () => {
    const ageMessage = ageConfirmed ? null : "Confirm that you are 16 or older.";
    const zoneMessage = timeZoneError(zone);
    setAgeError(ageMessage);
    setZoneError(zoneMessage);
    if (ageMessage !== null || zoneMessage !== null) return;

    const params = new URLSearchParams({ ageConfirmed: "true", timezone: zone, next });
    window.location.assign(`/api/app/auth/google?${params.toString()}`);
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <p className="text-sm text-ink-2">
        We will create your account for <span className="font-semibold text-ink">{email}</span>.
      </p>

      <FormFields>
        <div className="space-y-1">
          <Checkbox
            id={formId("ageConfirmed")}
            checked={ageConfirmed}
            onChange={(value) => {
              setAgeConfirmed(value);
              if (value) setAgeError(null);
            }}
            invalid={ageError !== null}
            describedBy={ageError === null ? undefined : "welcome-age-error"}
          >
            I am 16 or older
          </Checkbox>
          {ageError !== null && <FieldError id="welcome-age-error">{ageError}</FieldError>}
        </div>

        <TimeZoneCombobox
          id={formId("timezone")}
          label="Time zone"
          value={zone}
          onChange={setZone}
          error={zoneError}
          hint="Your study day and statistics use this time zone."
        />
      </FormFields>

      <Button type="submit" wide>
        Continue
      </Button>
    </form>
  );
}