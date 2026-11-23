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

export interface SessionSubjectOption {
  id: string;
  name: string;
  colour: string;
  archived: boolean;
  topics: readonly { id: string; name: string }[];
}

export interface SessionPlanEntryOption {
  id: string;
  label: string;
}

/** The form speaks the profile zone's wall clock; the page turns it into an instant. */
export interface SessionFields {
  subjectId: string;
  topicId: string | null;
  date: string;
  time: string;
  durationMin: number;
  /** The chosen plan entry id, or "" when none. */
  planEntryId: string;
  /** The chosen plan entry id, or "" when none. */
  planEntryId: string;
  label: string;
}

/** The form speaks the profile zone's wall clock; the page turns it into an instant. */
export interface SessionFields {
  subjectId: string;
  topicId: string | null;
  date: string;
  time: string;
  durationMin: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

/** A-4 entry dialog (FR-042, FR-048): subject, topic, start date and time, duration. */
export function SessionDialog({
  title,
  subjects,
  planEntries,
  initial,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  subjects: readonly SessionSubjectOption[];
  planEntries: readonly SessionPlanEntryOption[];
  initial?: Partial<SessionFields> | undefined;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (fields: SessionFields) => Promise<ApiFailure | null>;
}) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState(initial?.topicId ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [duration, setDuration] = useState(
    initial?.durationMin === undefined ? "30" : String(initial.durationMin),
  );
  const [planEntryId, setPlanEntryId] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const subject = subjects.find((entry) => entry.id === subjectId);
  const topics = subject?.topics ?? [];

  const submit = async () => {
    const found: FieldErrors = {};
    if (!DATE_PATTERN.test(date)) found["date"] = "Choose the date.";
    if (!TIME_PATTERN.test(time)) found["time"] = "Choose the start time.";
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      found["durationMin"] = "Choose a duration of 1 minute to 24 hours.";
    }
    if (!subjects.some((entry) => entry.id === subjectId)) {
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
      codeField: { manual_entry_too_long: "durationMin", daily_total_exceeded: "date" },
      ruleText: {
        instant: "Choose a real date and time.",
        date: "Choose a real date.",
        member_of_subject: "Choose a topic of this subject.",
        topic_archived: "Choose a topic that is not archived.",
        after_start: "Choose an end time after the start time.",
      },
    });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    if (failure.code === "manual_entry_overlaps_session") {
      setError(messageFor("manual_entry_overlaps_session", failure.message));
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
            <Label htmlFor={formId("sessionSubject")}>Subject</Label>
            <SelectInput
              id={formId("sessionSubject")}
              value={subjectId}
              onChange={(value) => {
                setSubjectId(value);
                // A topic belongs to one subject, so a new subject clears the choice.
                setTopicId("");
              }}
              invalid={errors["subjectId"] !== undefined}
              describedBy={errors["subjectId"] === undefined ? undefined : "session-subject-error"}
              options={subjects.map((entry) => ({
                value: entry.id,
                label: entry.archived ? `${entry.name} (archived)` : entry.name,
              }))}
            />
            {errors["subjectId"] !== undefined && (
              <FieldError id="session-subject-error">{errors["subjectId"]}</FieldError>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor={formId("sessionTopic")} optional>
              Topic
            </Label>
            <SelectInput
              id={formId("sessionTopic")}
              value={topicId}
              onChange={setTopicId}
              invalid={errors["topicId"] !== undefined}
              describedBy={errors["topicId"] === undefined ? undefined : "session-topic-error"}
              options={[
                { value: "", label: "No topic" },
                ...topics.map((topic) => ({ value: topic.id, label: topic.name })),
              ]}
            />
            {errors["topicId"] !== undefined && (
              <FieldError id="session-topic-error">{errors["topicId"]}</FieldError>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={formId("sessionDate")}>Date</Label>
              <TextInput
                id={formId("sessionDate")}
                type="date"
                value={date}
                onChange={setDate}
                invalid={errors["date"] !== undefined || errors["startedAt"] !== undefined}
                describedBy={errors["date"] === undefined && errors["startedAt"] === undefined ? undefined : "session-date-error"}
              />
              {(errors["date"] ?? errors["startedAt"]) !== undefined && (
                <FieldError id="session-date-error">
                  {errors["date"] ?? errors["startedAt"]}
                </FieldError>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor={formId("sessionTime")}>Start time</Label>
              <TextInput
                id={formId("sessionTime")}
                type="text"
                placeholder="09:00"
                value={time}
                onChange={setTime}
                invalid={errors["time"] !== undefined}
                describedBy={errors["time"] === undefined ? undefined : "session-time-error"}
              />
              {errors["time"] !== undefined && (
                <FieldError id="session-time-error">{errors["time"]}</FieldError>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor={formId("sessionDuration")}>Duration in minutes</Label>
            <TextInput
              id={formId("sessionDuration")}
              type="number"
              value={duration}
              onChange={setDuration}
              invalid={errors["durationMin"] !== undefined}
              describedBy="session-duration-hint"
            />
            <Hint id="session-duration-hint">
              {errors["durationMin"] ?? "From 1 minute to 24 hours."}
            </Hint>
          </div>

          {planEntries.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor={formId("sessionPlan")} optional>
                Link to a plan entry
              </Label>
              <SelectInput
                id={formId("sessionPlan")}
                value={planEntryId}
                onChange={setPlanEntryId}
                options={[
                  { value: "", label: "No plan entry" },
                  ...planEntries.map((entry) => ({ value: entry.id, label: entry.label })),
                ]}
              />
            </div>
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
