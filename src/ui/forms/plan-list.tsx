"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { PlanEntry, PlanWarning, PlanWarningCode } from "@/modules/plans/public";
import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ErrorPanel, Label, Panel, SelectInput, TextInput, formId } from "../control";
import { Dialog } from "../dialog";
import { formatLocalDate, instantInZone, timeInZone } from "../format";
import { SubjectDot } from "../subject-dot";
import { failureBody } from "./feedback";
import { PlanDialog, type PlanFields, type PlanSubjectOption } from "./plan-dialog";

interface EntriesPage {
  data: PlanEntry[];
}

type StatusFilter = "" | "upcoming" | "done" | "missed";

type DialogState =
  | { kind: "add"; initial?: Partial<PlanFields> }
  | { kind: "edit"; entry: PlanEntry; initial?: Partial<PlanFields> }
  | { kind: "delete"; entry: PlanEntry }
  | null;

/** A save the server refused until its warnings are confirmed (API-CONVENTIONS section 8). */
interface PendingSave {
  entry: PlanEntry | null;
  fields: PlanFields;
  warnings: PlanWarning[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** The warnings of a refused save, read off `details.warnings`. */
function warningsOf(failure: ApiFailure): PlanWarning[] {
  const raw = failure.details["warnings"];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((value): PlanWarning[] => {
    if (typeof value !== "object" || value === null) return [];
    const record = value as Record<string, unknown>;
    if (
      record["code"] === "overlap" &&
      typeof record["subjectId"] === "string" &&
      typeof record["startsAt"] === "string"
    ) {
      return [
        {
          code: "overlap",
          planEntryId: String(record["planEntryId"]),
          subjectId: record["subjectId"],
          startsAt: record["startsAt"],
          durationMin: Number(record["durationMin"]),
        },
      ];
    }
    if (record["code"] === "exam_date" && typeof record["examDate"] === "string") {
      return [{ code: "exam_date", examId: String(record["examId"]), examDate: record["examDate"] }];
    }
    return [];
  });
}

const statusLabel = { upcoming: "Upcoming", done: "Done", missed: "Missed" } as const;

/** The form values that reproduce an existing entry on the profile zone's clock. */
function fieldsOf(entry: PlanEntry, timeZone: string): PlanFields {
  return {
    subjectId: entry.subjectId,
    topicId: entry.topicId,
    date: entry.localDate,
    time: timeInZone(entry.startsAt, timeZone),
    durationMin: entry.durationMin,
  };
}

/** A-6 Plan list (FR-030..FR-038): filters, day groups, warnings and the missed mark. */
export function PlanList({
  subjects,
  today,
  timeZone,
  presetSubjectId,
}: {
  subjects: readonly PlanSubjectOption[];
  today: string;
  timeZone: string;
  presetSubjectId: string | null;
}) {
  const [entries, setEntries] = useState<PlanEntry[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const defaultFrom = today;
  const defaultTo = addDays(today, 13);
  const defaultSubjectId = presetSubjectId ?? "";
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [subjectFilter, setSubjectFilter] = useState(defaultSubjectId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [dialog, setDialog] = useState<DialogState>(
    presetSubjectId === null ? null : { kind: "add", initial: { subjectId: presetSubjectId } },
  );
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState<ApiFailure | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    // A half-typed date is not a request; the filter waits for a full value.
    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) return;
    const params = new URLSearchParams({ from, to });
    if (subjectFilter !== "") params.set("subjectId", subjectFilter);
    if (statusFilter !== "") params.set("status", statusFilter);
    const result = await apiRequest<EntriesPage>(`/api/app/plan-entries?${params}`, {
      method: "GET",
    });
    if (!result.ok) {
      setFailure(result.failure);
      return;
    }
    setFailure(null);
    setEntries(result.data.data);
  }, [from, to, subjectFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const subjectName = (id: string): string =>
    subjects.find((subject) => subject.id === id)?.name ?? "another subject";

  /** Returns the failure the form should show, or null when it is handled here. */
  const submit = async (
    entry: PlanEntry | null,
    fields: PlanFields,
    confirmed?: readonly PlanWarningCode[],
  ): Promise<ApiFailure | null> => {
    const body: Record<string, unknown> = {
      subjectId: fields.subjectId,
      topicId: fields.topicId,
      startsAt: instantInZone(fields.date, fields.time, timeZone),
      durationMin: fields.durationMin,
    };
    if (confirmed !== undefined) body["confirmedWarnings"] = confirmed;

    const result =
      entry === null
        ? await apiRequest<PlanEntry>("/api/app/plan-entries", {
            method: "POST",
            headers: { "idempotency-key": crypto.randomUUID() },
            body,
          })
        : await apiRequest<PlanEntry>(`/api/app/plan-entries/${entry.id}`, {
            method: "PATCH",
            headers: { "if-match": `"${entry.version}"` },
            body,
          });

    if (result.ok) {
      setDialog(null);
      setPendingSave(null);
      setStale(null);
      await load();
      return null;
    }

    const warnings = warningsOf(result.failure);
    if (result.failure.status === 409 && warnings.length > 0) {
      setDialog(null);
      setPendingSave({ entry, fields, warnings });
      return null;
    }
    if (result.failure.code === "stale_version" || result.failure.code === "past_entry_read_only") {
      setDialog(null);
      setStale(result.failure);
      return null;
    }
    return result.failure;
  };

  const saveConfirmed = async () => {
    if (pendingSave === null) return;
    setSaving(true);
    await submit(pendingSave.entry, pendingSave.fields, [
      ...new Set(pendingSave.warnings.map((warning) => warning.code)),
    ]);
    setSaving(false);
  };

  const remove = async (entry: PlanEntry) => {
    setBusy(entry.id);
    const result = await apiRequest<void>(`/api/app/plan-entries/${entry.id}`, {
      method: "DELETE",
      headers: { "if-match": `"${entry.version}"` },
    });
    setBusy(null);
    setDialog(null);
    if (result.ok) {
      await load();
      return;
    }
    if (result.failure.code === "stale_version") setStale(result.failure);
    else setFailure(result.failure);
  };

  const markMissed = async (entry: PlanEntry) => {
    setBusy(entry.id);
    setMenuFor(null);
    const result = await apiRequest<PlanEntry>(`/api/app/plan-entries/${entry.id}/missed`, {
      method: "POST",
      headers: { "if-match": `"${entry.version}"` },
    });
    setBusy(null);
    if (result.ok) {
      await load();
      return;
    }
    if (result.failure.code === "stale_version" || result.failure.code === "past_entry_read_only") {
      setStale(result.failure);
      return;
    }
    setFailure(result.failure);
  };

  const groups = new Map<string, PlanEntry[]>();
  for (const entry of entries ?? []) {
    const rows = groups.get(entry.localDate) ?? [];
    rows.push(entry);
    groups.set(entry.localDate, rows);
  }
  const now = Date.now();
  // FR-037 AC-3: a filtered list that matches nothing offers to clear the filters.
  const filtered =
    from !== defaultFrom ||
    to !== defaultTo ||
    subjectFilter !== defaultSubjectId ||
    statusFilter !== "";
  const clearFilters = () => {
    setFrom(defaultFrom);
    setTo(defaultTo);
    setSubjectFilter(defaultSubjectId);
    setStatusFilter("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={formId("planFrom")}>From</Label>
          <TextInput id={formId("planFrom")} type="date" value={from} onChange={setFrom} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("planTo")}>To</Label>
          <TextInput id={formId("planTo")} type="date" value={to} onChange={setTo} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("planFilterSubject")}>Subject</Label>
          <SelectInput
            id={formId("planFilterSubject")}
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[
              { value: "", label: "All subjects" },
              ...subjects.map((subject) => ({ value: subject.id, label: subject.name })),
            ]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("planFilterStatus")}>Status</Label>
          <SelectInput
            id={formId("planFilterStatus")}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={[
              { value: "", label: "All statuses" },
              { value: "upcoming", label: "Upcoming" },
              { value: "done", label: "Done" },
              { value: "missed", label: "Missed" },
            ]}
          />
        </div>
        <div className="ml-auto">
          <Button onClick={() => setDialog({ kind: "add" })}>Add plan entry</Button>
        </div>
      </div>

      {stale !== null && (
        <ErrorPanel
          title={
            stale.code === "stale_version"
              ? "This changed in another tab or device"
              : "This entry can no longer change"
          }
          body={failureBody(stale)}
          requestId={stale.requestId}
          action={
            <Button
              variant="secondary"
              onClick={async () => {
                setStale(null);
                await load();
              }}
            >
              Reload
            </Button>
          }
        />
      )}

      {entries === null && failure === null ? (
        <div aria-busy="true" className="space-y-2">
          <p role="status" className="sr-only">
            Loading plan entries
          </p>
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-12 rounded-card border border-line bg-sunken" />
          ))}
        </div>
      ) : failure !== null ? (
        <ErrorPanel
          title="Could not load planned sessions"
          body={failureBody(failure)}
          requestId={failure.requestId}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      ) : groups.size === 0 ? (
        <Panel className="space-y-3">
          <p className="text-ink-2">
            {filtered ? "No planned sessions match these filters" : "No planned sessions"}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setDialog({ kind: "add" })}>Add plan entry</Button>
            {filtered && (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </Panel>
      ) : (
        <div className="space-y-5">
          {[...groups].map(([day, rows]) => {
            const planned = rows.reduce((total, entry) => total + entry.plannedMin, 0);
            return (
              <section key={day} aria-labelledby={`plan-day-${day}`} className="space-y-2">
                <h2 id={`plan-day-${day}`} className="text-sm font-semibold text-ink-2">
                  {formatLocalDate(day, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                  {planned} min planned
                </h2>
                <ul className="space-y-2">
                  {rows.map((entry) => {
                    const subject = subjects.find((item) => item.id === entry.subjectId);
                    const topic = subject?.topics.find((item) => item.id === entry.topicId);
                    const past = Date.parse(entry.startsAt) <= now;
                    return (
                      <li
                        key={entry.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-line bg-surface p-3"
                      >
                        <SubjectDot colour={subject?.colour ?? "teal"} />
                        <p className="text-[15px] font-semibold text-ink">
                          {subject?.name ?? "Subject"}
                          {topic !== undefined && (
                            <span className="font-normal text-ink-2"> · {topic.name}</span>
                          )}
                        </p>
                        <p className="w-full text-sm text-muted sm:w-auto">
                          {timeInZone(entry.startsAt, timeZone)} · {entry.plannedMin} min planned
                          {past && entry.status === "upcoming" && " · Read only"}
                        </p>
                        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-2">
                          {statusLabel[entry.status]}
                        </span>
                        {past && entry.status === "missed" ? null : (
                          <div
                            className="relative ml-auto"
                            onBlur={(event) => {
                              if (!event.currentTarget.contains(event.relatedTarget)) setMenuFor(null);
                            }}
                          >
                            <Button
                              variant="secondary"
                              pending={busy === entry.id}
                              ariaLabel={`More actions for ${subject?.name ?? "subject"}, ${formatLocalDate(entry.localDate)}`}
                              onClick={() => setMenuFor(menuFor === entry.id ? null : entry.id)}
                            >
                              Actions
                            </Button>
                            {menuFor === entry.id && (
                              <ul className="absolute right-0 z-10 mt-1 w-48 rounded-card border border-line bg-surface p-1">
                                {past ? (
                                  <MenuItem
                                    onClick={() => {
                                      setMenuFor(null);
                                      void markMissed(entry);
                                    }}
                                  >
                                    Mark as missed
                                  </MenuItem>
                                ) : (
                                  <>
                                    <MenuItem
                                      onClick={() => {
                                        setMenuFor(null);
                                        setDialog({
                                          kind: "edit",
                                          entry,
                                          initial: fieldsOf(entry, timeZone),
                                        });
                                      }}
                                    >
                                      Edit
                                    </MenuItem>
                                    <MenuItem
                                      onClick={() => {
                                        setMenuFor(null);
                                        setDialog({ kind: "delete", entry });
                                      }}
                                    >
                                      Delete
                                    </MenuItem>
                                  </>
                                )}
                              </ul>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {(dialog?.kind === "add" || dialog?.kind === "edit") && (
        <PlanDialog
          title={dialog.kind === "add" ? "Add plan entry" : "Edit plan entry"}
          subjects={subjects}
          initial={
            dialog.kind === "add"
              ? (dialog.initial ?? {})
              : (dialog.initial ?? fieldsOf(dialog.entry, timeZone))
          }
          submitLabel="Save"
          onClose={() => setDialog(null)}
          onSubmit={(fields) =>
            submit(dialog.kind === "edit" ? dialog.entry : null, fields)
          }
        />
      )}

      {dialog?.kind === "delete" && (
        <Dialog open title="Delete this entry?" onClose={() => setDialog(null)}>
          <div className="space-y-4">
            <p className="text-sm text-ink-2">
              The planned time is removed. Sessions already recorded stay and still count.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button pending={busy === dialog.entry.id} onClick={() => void remove(dialog.entry)}>
                Delete
              </Button>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {pendingSave !== null && (
        <Dialog open title="Save anyway?" onClose={() => setPendingSave(null)}>
          <div className="space-y-4">
            <ul className="space-y-2">
              {pendingSave.warnings.map((warning, index) => (
                <li key={`${warning.code}-${String(index)}`} className="text-sm text-ink-2">
                  {warning.code === "overlap"
                    ? `This overlaps ${subjectName(warning.subjectId)} at ${timeInZone(warning.startsAt, timeZone)}.`
                    : `This is after the exam on ${formatLocalDate(warning.examDate)}.`}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button pending={saving} onClick={() => void saveConfirmed()}>
                Save anyway
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (pendingSave === null) return;
                  const { entry, fields } = pendingSave;
                  setDialog(
                    entry === null
                      ? { kind: "add", initial: fields }
                      : { kind: "edit", entry, initial: fields },
                  );
                  setPendingSave(null);
                }}
              >
                Change time
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="block w-full min-h-11 rounded px-3 text-left text-[15px] text-ink hover:bg-sunken"
      >
        {children}
      </button>
    </li>
  );
}