"use client";

import { useState } from "react";

import type { ExamListItem } from "@/modules/exams/public";
import type { ApiFailure } from "../api-client";
import { Button, FieldError, FormFields, Label, SelectInput, TextInput, formId } from "../control";
import { Dialog } from "../dialog";
import { messageFor } from "../messages";

export interface ExamSubjectOption {
  id: string;
  name: string;
  colour: string;
}

export interface ExamFields {
  subjectId: string;
  title: string;
  examDate: string;
}

/** `YYYY-MM-DD` to a display date without time-zone shifts (the date is the value). */
export function formatExamDate(examDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${examDate}T00:00:00Z`));
}

/**
 * FR-121: the add and edit dialogs. `dateOnly` is the archived list's "Change date"
 * (FR-125): an archived exam accepts only `examDate`, and that is all this form sends.
 */
export function ExamDialog({
  title,
  intro,
  subjects,
  initial,
  dateOnly = false,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  intro?: string | undefined;
  subjects: readonly ExamSubjectOption[];
  initial?: Partial<ExamFields> | undefined;
  dateOnly?: boolean | undefined;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (fields: ExamFields) => Promise<ApiFailure | null>;
}) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? subjects[0]?.id ?? "");
  const [name, setName] = useState(initial?.title ?? "");
  const [examDate, setExamDate] = useState(initial?.examDate ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!dateOnly && !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      setFieldError("Choose the exam date.");
      return;
    }
    if (!dateOnly && name.trim().length < 1) {
      setFieldError("Enter the exam title.");
      return;
    }
    if (dateOnly && !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      setFieldError("Choose the exam date.");
      return;
    }
    setFieldError(null);
    setError(null);
    setPending(true);
    const failure = await onSubmit(
      dateOnly
        ? { subjectId: initial?.subjectId ?? "", title: initial?.title ?? "", examDate }
        : { subjectId, title: name.trim(), examDate },
    );
    setPending(false);
    if (failure === null) return;
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
          {!dateOnly && !initial?.subjectId && (
            <div className="space-y-1">
              <Label htmlFor={formId("examSubject")}>Subject</Label>
              <SelectInput
                id={formId("examSubject")}
                value={subjectId}
                onChange={setSubjectId}
                options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
              />
            </div>
          )}
          {!dateOnly && (
            <div className="space-y-1">
              <Label htmlFor={formId("examTitle")}>Title</Label>
              <TextInput id={formId("examTitle")} type="text" value={name} onChange={setName} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor={formId("examDate")}>Exam date</Label>
            <TextInput
              id={formId("examDate")}
              type="date"
              value={examDate}
              onChange={setExamDate}
              invalid={fieldError !== null}
              describedBy={fieldError === null ? undefined : "exam-date-error"}
            />
            {fieldError !== null && <FieldError id="exam-date-error">{fieldError}</FieldError>}
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
