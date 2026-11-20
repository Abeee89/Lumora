"use client";

import { useState } from "react";

import type { ApiFailure } from "../api-client";
import { Button, FieldError, FormFields, Hint, Label, TextInput, formId } from "../control";
import { Dialog } from "../dialog";
import { messageFor } from "../messages";
import { subjectDotClass } from "../subject-dot";

export interface PaletteEntry {
  key: string;
  label: string;
}

/**
 * The add, edit and rename-before-restore dialog share one form (FR-010, FR-011). The caller
 * owns the request so each flow can send the fields and the If-Match it needs.
 */
export function SubjectDialog({
  title,
  intro,
  palette,
  initialName = "",
  initialColour,
  colourLocked = false,
  colourLockedHint,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  intro?: string | undefined;
  palette: readonly PaletteEntry[];
  initialName?: string | undefined;
  initialColour?: string | undefined;
  colourLocked?: boolean | undefined;
  colourLockedHint?: string | undefined;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string, colour: string) => Promise<ApiFailure | null>;
}) {
  const [name, setName] = useState(initialName);
  const [colour, setColour] = useState(initialColour ?? palette[0]?.key ?? "teal");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      setFieldError("Enter a name of 1 to 100 characters.");
      return;
    }
    setFieldError(null);
    setError(null);
    setPending(true);
    const failure = await onSubmit(trimmed, colour);
    setPending(false);
    if (failure === null) return;
    if (failure.code === "name_conflict") {
      setFieldError(messageFor(failure.code));
      return;
    }
    setError(messageFor(failure.code, failure.message));
  };

  return (
    <Dialog open title={title} onClose={onClose}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        {intro !== undefined && <p className="text-sm text-ink-2">{intro}</p>}
        {error !== null && (
          <p role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        )}

        <FormFields>
          <div className="space-y-1">
            <Label htmlFor={formId("subjectName")}>Name</Label>
            <TextInput
              id={formId("subjectName")}
              type="text"
              value={name}
              onChange={setName}
              invalid={fieldError !== null}
              describedBy={fieldError === null ? undefined : "subject-name-error"}
            />
            {fieldError !== null && <FieldError id="subject-name-error">{fieldError}</FieldError>}
          </div>

          {!colourLocked ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-ink">Colour</legend>
              <div className="flex flex-wrap gap-2">
                {palette.map((entry) => (
                  <label
                    key={entry.key}
                    className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-[15px] text-ink ${
                      colour === entry.key ? "border-primary" : "border-line-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="subject-colour"
                      value={entry.key}
                      checked={colour === entry.key}
                      onChange={() => setColour(entry.key)}
                      className="pointer-events-none size-5 shrink-0 accent-primary"
                    />
                    <span
                      aria-hidden="true"
                      className={`inline-block size-3 rounded-full ${subjectDotClass(entry.key)}`}
                    />
                    {entry.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            colourLockedHint !== undefined && <Hint id="subject-colour-hint">{colourLockedHint}</Hint>
          )}
        </FormFields>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" pending={pending}>
            {submitLabel}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
