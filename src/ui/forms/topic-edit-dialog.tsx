"use client";

import { useState } from "react";

import type { Topic } from "@/modules/topics/public";
import type { ApiFailure } from "../api-client";
import { Button, FieldError, FormFields, Label, SelectInput, TextInput, formId } from "../control";
import { Dialog } from "../dialog";
import { messageFor } from "../messages";

const weightOptions = [1, 2, 3, 4, 5].map((weight) => ({
  value: String(weight),
  label: String(weight),
}));

/** FR-016: rename a topic and set its weight, which the readiness score reads later. */
export function TopicEditDialog({
  topic,
  onClose,
  onSubmit,
}: {
  topic: Topic;
  onClose: () => void;
  onSubmit: (name: string, weight: number) => Promise<ApiFailure | null>;
}) {
  const [name, setName] = useState(topic.name);
  const [weight, setWeight] = useState(String(topic.weight));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 150) {
      setFieldError("Enter a name of 1 to 150 characters.");
      return;
    }
    setFieldError(null);
    setError(null);
    setPending(true);
    const failure = await onSubmit(trimmed, Number.parseInt(weight, 10));
    setPending(false);
    if (failure === null) {
      onClose();
      return;
    }
    setError(messageFor(failure.code, failure.message));
  };

  return (
    <Dialog open title="Edit topic" onClose={onClose}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        {error !== null && (
          <p role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        )}
        <FormFields>
          <div className="space-y-1">
            <Label htmlFor={formId("topicName")}>Name</Label>
            <TextInput
              id={formId("topicName")}
              type="text"
              value={name}
              onChange={setName}
              invalid={fieldError !== null}
              describedBy={fieldError === null ? undefined : "topic-name-error"}
            />
            {fieldError !== null && <FieldError id="topic-name-error">{fieldError}</FieldError>}
          </div>
          <div className="space-y-1">
            <Label htmlFor={formId("topicWeight")}>Weight</Label>
            <SelectInput
              id={formId("topicWeight")}
              value={weight}
              onChange={setWeight}
              options={weightOptions}
              describedBy="topic-weight-hint"
            />
            <p className="text-sm text-muted" id="topic-weight-hint">
              1 is the lightest and 5 the heaviest. Readiness leans on heavier topics.
            </p>
          </div>
        </FormFields>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" pending={pending}>
            Save changes
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
