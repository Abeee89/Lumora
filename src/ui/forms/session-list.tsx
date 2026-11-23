"use client";

import { useCallback, useEffect, useState } from "react";

import type { StudySession } from "@/modules/sessions/public";
import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ErrorPanel, Label, Panel, SelectInput, TextInput, formId } from "../control";
import { Dialog } from "../dialog";
import { formatLocalDate, instantInZone, timeInZone } from "../format";
import { SubjectDot } from "../subject-dot";
import { failureBody } from "./feedback";
import {
  SessionDialog,
  type SessionFields,
  type SessionPlanEntryOption,
  type SessionSubjectOption,
} from "./session-dialog";

interface SessionsPage {
  data: StudySession[];
  page: { nextCursor: string | null; hasMore: boolean };
}

type DialogState =
  | { kind: "add"; initial?: Partial<SessionFields> }
  | { kind: "edit"; session: StudySession; initial?: Partial<SessionFields> }
  | { kind: "delete"; session: StudySession }
  | null;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function minutesOf(seconds: number): number {
  return Math.round(seconds / 60);
}

/** The form values that reproduce an existing session on the profile zone's clock. */
function fieldsOf(session: StudySession, timeZone: string): SessionFields {
  return {
    planEntryId: session.planEntryId ?? "",
    subjectId: session.subjectId,
    topicId: session.topicId,
    date: session.localDate,
    time: timeInZone(session.startedAt, timeZone),
    durationMin: minutesOf(session.durationSeconds),
  };
}

/** A session touches a day with a positive slice; one row per local day (EC-009). */
function spansText(session: StudySession): string | null {
  if (session.dayAllocations.length < 2) return null;
  const sorted = [...session.dayAllocations].sort((a, b) => a.localDate.localeCompare(b.localDate));
  const [earlier, later] = sorted;
  if (earlier === undefined || later === undefined) return null;
  return `Spans two days: ${minutesOf(earlier.seconds)} min and ${minutesOf(later.seconds)} min`;
}

/** A-4 Sessions (FR-040..FR-048): filters, day groups, source chips and row actions. */
export function SessionList({
  subjects,
  planEntries,
  today,
  timeZone,
}: {
  subjects: readonly SessionSubjectOption[];
  planEntries: readonly SessionPlanEntryOption[];
  today: string;
  timeZone: string;
}) {
  const [sessions, setSessions] = useState<StudySession[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const defaultFrom = today;
  const defaultTo = today;
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [stale, setStale] = useState<ApiFailure | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) return;
    const params = new URLSearchParams({ from, to, limit: "25" });
    if (subjectFilter !== "") params.set("subjectId", subjectFilter);
    if (cursor !== undefined) params.set("cursor", cursor);
    const result = await apiRequest<SessionsPage>(`/api/app/sessions?${params}`, {
      method: "GET",
    });
    if (!result.ok) {
      setFailure(result.failure);
      return;
    }
    setFailure(null);
    setSessions((previous) => (cursor === undefined ? result.data.data : [...(previous ?? []), ...result.data.data]));
    setNextCursor(result.data.page.nextCursor);
    setHasMore(result.data.page.hasMore);
  }, [from, to, subjectFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const subjectName = (id: string): string =>
    subjects.find((subject) => subject.id === id)?.name ?? "another subject";

  const subjectArchived = (id: string): boolean =>
    subjects.find((subject) => subject.id === id)?.archived ?? false;

  const submit = async (
    session: StudySession | null,
    fields: SessionFields,
  ): Promise<ApiFailure | null> => {
    const startedAt = instantInZone(fields.date, fields.time, timeZone);
    const endedAt = instantInZone(
      fields.date,
      fields.time,
      timeZone,
      fields.durationMin,
    );
    const body: Record<string, unknown> = {
      subjectId: fields.subjectId,
      topicId: fields.topicId,
      startedAt,
      endedAt,
    };
    if (fields.planEntryId !== "") body["planEntryId"] = fields.planEntryId;
    const body: Record<string, unknown> = {
      subjectId: fields.subjectId,
      topicId: fields.topicId,
      startedAt: instantInZone(fields.date, fields.time, timeZone),
      endedAt: instantInZone(fields.date, fields.time, timeZone, fields.durationMin),
    };
    const planEntryId = dialog?.kind === "add" ? selectedPlanEntryId : null;
    if (planEntryId !== null) body["planEntryId"] = planEntryId;

    const result =
      session === null
        ? await apiRequest<StudySession>("/api/app/sessions", {
            method: "POST",
            headers: { "idempotency-key": crypto.randomUUID() },
            body,
          })
        : await apiRequest<StudySession>(`/api/app/sessions/${session.id}`, {
            method: "PATCH",
            headers: { "if-match": `"${session.version}"` },
            body,
          });

    if (result.ok) {
      setDialog(null);
      setStale(null);
      await load();
      return null;
    }
    if (result.failure.code === "stale_version") {
      setDialog(null);
      setStale(result.failure);
      return null;
    }
    return result.failure;
  };

  const remove = async (session: StudySession) => {
    setBusy(session.id);
    const result = await apiRequest<void>(`/api/app/sessions/${session.id}`, {
      method: "DELETE",
      headers: { "if-match": `"${session.version}"` },
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

  const groups = new Map<string, StudySession[]>();
  for (const session of sessions ?? []) {
    const rows = groups.get(session.localDate) ?? [];
    rows.push(session);
    groups.set(session.localDate, rows);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={formId("sessionFrom")}>From</Label>
          <TextInput id={formId("sessionFrom")} type="date" value={from} onChange={setFrom} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("sessionTo")}>To</Label>
          <TextInput id={formId("sessionTo")} type="date" value={to} onChange={setTo} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={formId("sessionFilterSubject")}>Subject</Label>
          <SelectInput
            id={formId("sessionFilterSubject")}
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[
              { value: "", label: "All subjects" },
              ...subjects.map((subject) => ({ value: subject.id, label: subject.name })),
            ]}
          />
        </div>
        <div className="ml-auto">
          <Button onClick={() => setDialog({ kind: "add" })}>Add manual session</Button>
        </div>
      </div>

      {stale !== null && (
        <ErrorPanel
          title="This changed in another tab or device"
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

      {sessions === null && failure === null ? (
        <div aria-busy="true" className="space-y-2">
          <p role="status" className="sr-only">
            Loading sessions
          </p>
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-12 rounded-card border border-line bg-sunken" />
          ))}
        </div>
      ) : failure !== null ? (
        <ErrorPanel
          title="Could not load sessions"
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
          <p className="text-ink-2">No sessions yet</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setDialog({ kind: "add" })}>Add manual session</Button>
          </div>
        </Panel>
      ) : (
        <div className="space-y-5">
          {[...groups].map(([day, rows]) => {
            const total = rows.reduce(
              (sum, session) => sum + session.dayAllocations.reduce((a, d) => a + d.seconds, 0),
              0,
            );
            return (
              <section key={day} aria-labelledby={`session-day-${day}`} className="space-y-2">
                <h2 id={`session-day-${day}`} className="text-sm font-semibold text-ink-2">
                  {formatLocalDate(day, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                  {minutesOf(total)} min
                </h2>
                <ul className="space-y-2">
                  {rows.map((session) => {
                    const subject = subjects.find((item) => item.id === session.subjectId);
                    const topic = subject?.topics.find((item) => item.id === session.topicId);
                    const spans = spansText(session);
                    return (
                      <li
                        key={session.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-line bg-surface p-3"
                      >
                        <SubjectDot colour={subject?.colour ?? "teal"} />
                        <p className="text-[15px] font-semibold text-ink">
                          {subject?.name ?? "Subject"}
                          {subjectArchived(session.subjectId) && " (archived)"}
                          {topic !== undefined && (
                            <span className="font-normal text-ink-2"> · {topic.name}</span>
                          )}
                        </p>
                        <p className="w-full text-sm text-muted sm:w-auto">
                          {timeInZone(session.startedAt, timeZone)} –{" "}
                          {timeInZone(session.endedAt, timeZone)} · {minutesOf(session.durationSeconds)} min
                          {spans !== null && <span> · {spans}</span>}
                        </p>
                        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-2">
                          {session.source === "manual" ? "Manual" : "Timer"}
                        </span>
                        {session.autoClosed && (
                          <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-2">
                            Auto-closed
                          </span>
                        )}
                        <div
                          className="relative ml-auto"
                          onBlur={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget)) setMenuFor(null);
                          }}
                        >
                          <Button
                            variant="secondary"
                            pending={busy === session.id}
                            ariaLabel={`More actions for ${subject?.name ?? "subject"}, ${formatLocalDate(session.localDate)}`}
                            onClick={() => setMenuFor(menuFor === session.id ? null : session.id)}
                          >
                            Actions
                          </Button>
                          {menuFor === session.id && (
                            <ul className="absolute right-0 z-10 mt-1 w-48 rounded-card border border-line bg-surface p-1">
                              <MenuItem
                                onClick={() => {
                                  setMenuFor(null);
                                  setDialog({
                                    kind: "edit",
                                    session,
                                    initial: fieldsOf(session, timeZone),
                                  });
                                }}
                              >
                                Edit
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  setMenuFor(null);
                                  setDialog({ kind: "delete", session });
                                }}
                              >
                                Delete
                              </MenuItem>
                            </ul>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {hasMore && (
        <Button
          variant="secondary"
          pending={loadingMore}
          onClick={async () => {
            if (nextCursor === null) return;
            setLoadingMore(true);
            await load(nextCursor);
            setLoadingMore(false);
          }}
        >
          Load more
        </Button>
      )}

      {(dialog?.kind === "add" || dialog?.kind === "edit") && (
        <SessionDialog
          title={dialog.kind === "add" ? "Add manual session" : "Edit session"}
          subjects={subjects}
          planEntries={planEntries}
          initial={
            dialog.kind === "add"
              ? (dialog.initial ?? {})
              : (dialog.initial ?? fieldsOf(dialog.session, timeZone))
          }
          submitLabel="Save"
          onClose={() => setDialog(null)}
          onSubmit={(fields) => submit(dialog.kind === "edit" ? dialog.session : null, fields)}
        />
      )}

      {dialog?.kind === "delete" && (
        <Dialog
          open
          title={`Delete session '${subjectName(dialog.session.subjectId)}, ${formatLocalDate(dialog.session.localDate, { day: "numeric", month: "short" })}'?`}
          onClose={() => setDialog(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-ink-2">
              The recorded time is removed and no longer counts toward your history.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button pending={busy === dialog.session.id} onClick={() => void remove(dialog.session)}>
                Delete session
              </Button>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
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
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-sunken"
      >
        {children}
      </button>
    </li>
  );
}
