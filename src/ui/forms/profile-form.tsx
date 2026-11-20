"use client";

import { useState } from "react";

import { apiRequest, type ApiFailure } from "../api-client";
import { TimeZoneCombobox, timeZoneError } from "../combobox";
import { Button, ErrorPanel, FieldError, FormFields, Hint, Label, SelectInput, TextInput, formId } from "../control";
import { messageFor } from "../messages";

export interface ProfileFormData {
  displayName: string;
  timezone: string;
  rolloverHour: number;
  version: number;
}

type ProfileView = ProfileFormData;

const rolloverOptions = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, "0")}:00`,
}));

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** A-15 Profile section (FR-006, FR-009). */
export function ProfileForm({ initial }: { initial: ProfileFormData }) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [rolloverHour, setRolloverHour] = useState(String(initial.rolloverHour));
  const [version, setVersion] = useState(initial.version);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    const local: Record<string, string> = {};
    if (displayName.trim().length === 0 || displayName.trim().length > 50) {
      local["displayName"] = "Enter a display name of 1 to 50 characters.";
    }
    const zoneMessage = timeZoneError(timezone);
    if (zoneMessage !== null) local["timezone"] = zoneMessage;
    const hour = Number.parseInt(rolloverHour, 10);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      local["rolloverHour"] = "Choose an hour between 00 and 23.";
    }
    setErrors(local);
    setFailure(null);
    setSaved(false);
    if (Object.keys(local).length > 0) return;

    setPending(true);
    const result = await apiRequest<ProfileView>("/api/app/profile", {
      method: "PATCH",
      headers: { "if-match": `"${version}"` },
      body: {
        displayName: displayName.trim(),
        timezone,
        rolloverHour: hour,
      },
    });
    setPending(false);

    if (!result.ok) {
      setFailure(result.failure);
      return;
    }
    setVersion(result.data.version);
    setDisplayName(result.data.displayName);
    setTimezone(result.data.timezone);
    setRolloverHour(String(result.data.rolloverHour));
    setSaved(true);
  };

  const stale = failure?.code === "stale_version";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      {stale && (
        <ErrorPanel
          title="This changed in another tab or device"
          body={messageFor("stale_version")}
          action={
            <Button onClick={() => window.location.reload()} variant="secondary">
              Reload
            </Button>
          }
        />
      )}

      {failure !== null && !stale && (
        <ErrorPanel
          title="We could not save your profile"
          body={messageFor(failure.code, failure.message)}
          requestId={failure.requestId}
          action={<Button onClick={() => void submit()}>Retry</Button>}
        />
      )}

      <FormFields>
        <div className="space-y-1">
          <Label htmlFor={formId("displayName")}>Display name</Label>
          <TextInput
            id={formId("displayName")}
            type="text"
            value={displayName}
            onChange={setDisplayName}
            autoComplete="name"
            invalid={errors["displayName"] !== undefined}
            describedBy={errors["displayName"] === undefined ? undefined : "profile-name-error"}
          />
          {errors["displayName"] !== undefined && (
            <FieldError id="profile-name-error">{errors["displayName"]}</FieldError>
          )}
        </div>

        <TimeZoneCombobox
          id={formId("timezone")}
          label="Time zone"
          value={timezone}
          onChange={setTimezone}
          error={errors["timezone"] ?? null}
          hint="Changing timezone applies from now on. Past days keep their dates."
        />

        <div className="space-y-1">
          <Label htmlFor={formId("rolloverHour")}>Study day starts at</Label>
          <SelectInput
            id={formId("rolloverHour")}
            value={rolloverHour}
            onChange={setRolloverHour}
            options={rolloverOptions}
            invalid={errors["rolloverHour"] !== undefined}
            describedBy={errors["rolloverHour"] === undefined ? undefined : "profile-hour-error"}
          />
          <Hint id={`${formId("rolloverHour")}-hint`}>
            Your study day starts at {formatHour(Number.parseInt(rolloverHour, 10) || 0)}.
          </Hint>
          {errors["rolloverHour"] !== undefined && (
            <FieldError id="profile-hour-error">{errors["rolloverHour"]}</FieldError>
          )}
        </div>
      </FormFields>

      <div className="flex items-center gap-4">
        <Button type="submit" pending={pending}>
          Save changes
        </Button>
        <p role="status" className="text-sm text-ink-2">
          {saved ? "Saved" : ""}
        </p>
      </div>
    </form>
  );
}