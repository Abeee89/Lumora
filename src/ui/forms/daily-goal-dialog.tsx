"use client";

import { useState } from "react";

import type { ApiFailure } from "../api-client";
import { Button, FieldError, FormFields, Hint, Label, TextInput, formId } from "../control";
import { Dialog } from "../dialog";
import { messageFor } from "../messages";
import { failureBody } from "./feedback";
import { dailyGoalError } from "./goal-fields";

/**
 * A-3 "Edit goal" (GOAL-02, FR-070, FR-074). The target changes from the current local day
 * forward: past days keep the target in force on them, so the dialog says so.
 */
export function DailyGoalDialog({
  current,
  min,
  max,
  onClose,
  onSave,
}: {
  current: number;
  min: number;
  max: number;
  onClose: () => void;
  onSave: (targetMinutes: number) => Promise<ApiFailure | null>;
}) {
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const message = dailyGoalError(value, min, max);
    setError(message);
    setFailure(null);
    if (message !== null) return;

    setPending(true);
    const result = await onSave(Number(value));
    setPending(false);
    if (result !== null) setFailure(result);
  };

  return (
    <Dialog open title="Daily goal" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormFields>
          <div>
            <Label htmlFor={formId("dailyGoal")}>Minutes of study a day</Label>
            <TextInput
              id={formId("dailyGoal")}
              type="number"
              value={value}
              onChange={(next) => {
                setValue(next);
                setError(null);
              }}
              invalid={error !== null}
              describedBy={formId("dailyGoal-hint")}
            />
            {error === null ? (
              <Hint id={formId("dailyGoal-hint")}>{`${min} to ${max}`}</Hint>
            ) : (
              <FieldError id={formId("dailyGoal-hint")}>{error}</FieldError>
            )}
          </div>
        </FormFields>
        <p className="mt-3 text-sm text-ink-2">
          This applies from today onward. Past days keep the goal they had.
        </p>
        {failure !== null && (
          <p role="alert" className="mt-3 text-sm text-error">
            {messageFor(failure.code, failureBody(failure))}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" pending={pending}>
            Save goal
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
