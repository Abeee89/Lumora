"use client";

import { useState } from "react";

import type { TimerSettings } from "@/modules/timer/public";
import type { ApiFailure } from "../api-client";
import { Button, FieldError, FormFields, Hint, Label, TextInput, formId } from "../control";
import { Dialog } from "../dialog";
import { messageFor } from "../messages";
import { failureBody } from "./feedback";

export interface DurationFields {
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number;
}

/** The ranges A-3 states, so a refusal can name the allowed value without a request. */
export const durationRanges = {
  focusMin: [1, 120],
  breakMin: [1, 60],
  longBreakMin: [1, 60],
  cyclesBeforeLongBreak: [2, 8],
} as const;

type DurationKey = keyof DurationFields;

function rangeText(key: DurationKey): string {
  const [min, max] = durationRanges[key];
  return `Choose ${min} to ${max}.`;
}

/**
 * A-3 "Timer durations" (FR-057, TIM-08). The row is created lazily, so the first save
 * sends no `If-Match`; every later one carries the version the server last answered.
 */
export function TimerDurationsDialog({
  settings,
  onClose,
  onSave,
}: {
  settings: TimerSettings;
  onClose: () => void;
  onSave: (fields: DurationFields) => Promise<ApiFailure | null>;
}) {
  const [fields, setFields] = useState<Record<DurationKey, string>>({
    focusMin: String(settings.focusMin),
    breakMin: String(settings.breakMin),
    longBreakMin: String(settings.longBreakMin),
    cyclesBeforeLongBreak: String(settings.cyclesBeforeLongBreak),
  });
  const [errors, setErrors] = useState<Partial<Record<DurationKey, string>>>({});
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const next: Partial<Record<DurationKey, string>> = {};
    const parsed = {} as DurationFields;
    for (const key of Object.keys(fields) as DurationKey[]) {
      const value = Number(fields[key]);
      const [min, max] = durationRanges[key];
      if (!Number.isInteger(value) || value < min || value > max) {
        next[key] = rangeText(key);
        continue;
      }
      parsed[key] = value;
    }
    setErrors(next);
    setFailure(null);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    const error = await onSave(parsed);
    setPending(false);
    if (error !== null) setFailure(error);
  };

  const field = (key: DurationKey, label: string, hint: string) => (
    <div>
      <Label htmlFor={formId(`duration-${key}`)}>{label}</Label>
      <TextInput
        id={formId(`duration-${key}`)}
        type="number"
        value={fields[key]}
        onChange={(value) => setFields({ ...fields, [key]: value })}
        invalid={errors[key] !== undefined}
        describedBy={formId(`duration-${key}-hint`)}
      />
      {errors[key] === undefined ? (
        <Hint id={formId(`duration-${key}-hint`)}>{hint}</Hint>
      ) : (
        <FieldError id={formId(`duration-${key}-hint`)}>{errors[key]}</FieldError>
      )}
    </div>
  );

  return (
    <Dialog open title="Timer durations" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormFields>
          {field("focusMin", "Focus (minutes)", "1 to 120")}
          {field("breakMin", "Break (minutes)", "1 to 60")}
          {field("longBreakMin", "Long break (minutes)", "1 to 60")}
          {field("cyclesBeforeLongBreak", "Focus intervals before a long break", "2 to 8")}
        </FormFields>
        <p className="mt-3 text-sm text-ink-2">
          Durations apply to the next timer you start. A running timer keeps its own.
        </p>
        {failure !== null && (
          <p role="alert" className="mt-3 text-sm text-error">
            {messageFor(failure.code, failureBody(failure))}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" pending={pending}>
            Save durations
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** EC-002: a second start names the run it would end, and only the second press replaces it. */
export function ReplaceTimerDialog({
  summary,
  pending,
  onClose,
  onReplace,
}: {
  summary: string;
  pending: boolean;
  onClose: () => void;
  onReplace: () => void;
}) {
  return (
    <Dialog open title="A timer is already running" onClose={onClose}>
      <p className="text-sm text-ink-2">
        {summary} is running. Starting another timer ends it and keeps the time it measured.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onReplace} pending={pending}>
          Replace timer
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Keep it
        </Button>
      </div>
    </Dialog>
  );
}