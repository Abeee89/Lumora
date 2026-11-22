"use client";

import { useState } from "react";

import type { ApiFailure } from "../api-client";
import {
  Button,
  FieldError,
  FormFields,
  Hint,
  Label,
  SelectInput,
  TextInput,
  formId,
} from "../control";
import { Dialog } from "../dialog";
import { messageFor } from "../messages";
import { errorsFromFailure, type FieldErrors } from "./feedback";

export interface PlanSubjectOption {
  id: string;
  name: string;
  colour: string;
  topics: readonly { id: string; name: string }[];
}

/** The form speaks the profile zone's wall clock; the page turns it into an instant. */
export interface PlanFields {
  subjectId: string;
  topicId: string | null;
  date: string;
  time: string;
  durationMin: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

/** A-6 entry dialog (FR-030, FR-031): subject, topic, date, start time, duration 5 to 480. */
export function PlanDialog({
  title,
  subjects,
  initial,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  subjects: readonly PlanSubjectOption[];
  initial?: Partial<PlanFields> | undefined;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (fields: PlanFields) => Promise<ApiFailure | null>;
}) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState(initial?.topicId ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [duration, setDuration] = useState(
    initial?.durationMin === undefined ? "60" : String(initial.durationMin),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const topics = subjects.find((subject) => subject.id === subjectId)?.topics ?? [];

  const submit = async () => {
    const found: FieldErrors = {};
    if (!DATE_PATTERN.test(date)) found["date"] = "Choose the date.";
    if (!TIME_PATTERN.test(time)) found["time"] = "Choose the start time.";
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) {
      found["durationMin"] = "Choose a duration of 5 to 480 minutes.";
    }
    if (!subjects.some((subject) => subject.id === subjectId)) {
      found["subjectId"] = "Choose a subject.";
    }
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    const failure = await onSubmit({
      subjectId,
      topicId: topicId === "" ? null : topicId,
      date,
      time,
      durationMin: minutes,
    });
    setPending(false);
    if (failure === null) return;

    const fieldErrors = errorsFromFailure(failure, {
      codeField: { duration_out_of_range: "durationMin" },
      ruleText: {
        future: "Choose a start time in the future.",
        instant: "Choose a real date and time.",
        date: "Choose a real date.",
        member_of_subject: "Choose a topic of this subject.",
        topic_archived: "Choose a topic that is not archived.",
      },
    });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setError(messageFor(failure.code, failure.message));
  };

  return (
    <Dialog
      open
      title={title}
      onClose={onClose}
      className="max-sm:m-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-dvw max-sm:max-w-none max-sm:rounded-none max-sm:overflow-y-auto"
    >
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
            <Label htmlFor={formId("planSubject")}>Subject</Label>
            <SelectInput
              id={formId("planSubject")}
              value={subjectId}
              onChange={(value) => {
                setSubjectId(value);
                // A topic belongs to one subject, so a new subject clears the choice.
                setTopicId("");
              }}
              invalid={errors["subjectId"] !== undefined}
              describedBy={errors["subjectId"] === undefined ? undefined : "plan-subject-error"}
              options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
            />
            {errors["subjectId"] !== undefined && (
              <FieldError id="plan-subject-error">{errors["subjectId"]}</FieldError>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor={formId("planTopic")} optional>
              Topic
            </Label>
            <SelectInput
              id={formId("planTopic")}
              value={topicId}
              onChange={setTopicId}
              invalid={errors["topicId"] !== undefined}
              describedBy={errors["topicId"] === undefined ? undefined : "plan-topic-error"}
              options={[
                { value: "", label: "No topic" },
                ...topics.map((topic) => ({ value: topic.id, label: topic.name })),
              ]}
            />
            {errors["topicId"] !== undefined && (
              <FieldError id="plan-topic-error">{errors["topicId"]}</FieldError>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={formId("planDate")}>Date</Label>
              <TextInput
                id={formId("planDate")}
                type="date"
                value={date}
                onChange={setDate}
                invalid={errors["date"] !== undefined || errors["startsAt"] !== undefined}
                describedBy={errors["date"] === undefined && errors["startsAt"] === undefined ? undefined : "plan-date-error"}
              />
              {(errors["date"] ?? errors["startsAt"]) !== undefined && (
                <FieldError id="plan-date-error">{errors["date"] ?? errors["startsAt"]}</FieldError>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor={formId("planTime")}>Start time</Label>
              <TextInput
                id={formId("planTime")}
                type="text"
                placeholder="09:00"
                value={time}
                onChange={setTime}
                invalid={errors["time"] !== undefined}
                describedBy={errors["time"] === undefined ? undefined : "plan-time-error"}
              />
              {errors["time"] !== undefined && <FieldError id="plan-time-error">{errors["time"]}</FieldError>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor={formId("planDuration")}>Duration in minutes</Label>
            <TextInput
              id={formId("planDuration")}
              type="number"
              value={duration}
              onChange={setDuration}
              invalid={errors["durationMin"] !== undefined}
              describedBy="plan-duration-hint"
            />
            <Hint id="plan-duration-hint">
              {errors["durationMin"] ?? "From 5 to 480 minutes."}
            </Hint>
          </div>
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