"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { ExamListItem } from "@/modules/exams/public";
import { apiRequest, fieldIssues, type ApiFailure } from "../api-client";
import { Button, ErrorPanel, Panel } from "../control";
import { countText } from "../format";
import { messageFor } from "../messages";
import { SubjectDot } from "../subject-dot";
import { failureBody } from "./feedback";
import { ExamDialog, formatExamDate } from "./exam-dialog";

type Tab = "upcoming" | "archived";

interface ExamsPage {
  data: ExamListItem[];
  page: { nextCursor: string | null; hasMore: boolean };
}

type DialogState = { kind: "add" } | { kind: "edit"; row: ExamListItem } | null;

/** A-12 Exams list (FR-120, FR-125). Archived exams are read-only except the date. */
export function ExamList({ subjects }: { subjects: readonly { id: string; name: string; colour: string }[] }) {
  const [upcoming, setUpcoming] = useState<ExamListItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [actionFailure, setActionFailure] = useState<ApiFailure | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pending, setPending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadUpcoming = useCallback(async () => {
    const result = await apiRequest<ExamsPage>("/api/app/exams?state=upcoming", { method: "GET" });
    if (!result.ok) {
      setFailure(result.failure);
      return;
    }
    setUpcoming(result.data.data);
  }, []);

  useEffect(() => {
    void loadUpcoming();
  }, [loadUpcoming]);

  const loadArchived = useCallback(async (cursor: string | null): Promise<ExamsPage | null> => {
    const params = new URLSearchParams({ state: "archived" });
    if (cursor !== null) params.set("cursor", cursor);
    const result = await apiRequest<ExamsPage>(`/api/app/exams?${params}`, { method: "GET" });
    return result.ok ? result.data : null;
  }, []);

  const [archived, setArchived] = useState<ExamListItem[] | null>(null);

  const ensureArchived = async () => {
    if (archived !== null) return;
    const page = await loadArchived(null);
    if (page === null) return;
    setArchived(page.data);
    setNextCursor(page.page.nextCursor);
    setHasMore(page.page.hasMore);
  };

  useEffect(() => {
    if (tab !== "archived") return;
    void ensureArchived();
  }, [tab, archived]);

  const shown = tab === "upcoming" ? (upcoming ?? []) : (archived ?? []);
  const countdownText = (row: ExamListItem): string => {
    const countdown = row.countdown;
    if (countdown === null) return "";
    if (countdown.isToday) return "Today";
    return countdown.daysRemaining === 1
      ? "1 day to go"
      : `${countdown.daysRemaining} days to go`;
  };

  const save = async (row: ExamListItem, patch: Record<string, unknown>) => {
    const result = await apiRequest<ExamListItem>(`/api/app/exams/${row.id}`, {
      method: "PATCH",
      headers: { "if-match": `"${row.version}"` },
      body: patch,
    });
    if (!result.ok) return result.failure;
    await loadUpcoming();
    setArchived(null);
    setNextCursor(null);
    setHasMore(false);
    return null;
  };

  if (failure !== null) {
    return (
      <ErrorPanel title="Could not load exams" body={failureBody(failure)} requestId={failure.requestId} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Exam lists" className="flex gap-1">
          {(["upcoming", "archived"] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              tabIndex={tab === name ? 0 : -1}
              onClick={() => setTab(name)}
              className={`inline-flex min-h-11 items-center rounded-lg px-4 text-[15px] ${
                tab === name ? "bg-primary-soft font-semibold text-on-primary-soft" : "text-ink-2 hover:text-primary"
              }`}
            >
              {name === "upcoming" ? "Upcoming" : "Archived"}
            </button>
          ))}
        </div>
        <Button onClick={() => setDialog({ kind: "add" })}>Add exam</Button>
      </div>

      {actionFailure !== null && (
        <ErrorPanel
          title="That did not work"
          body={failureBody(actionFailure)}
          requestId={actionFailure.requestId}
        />
      )}

      {shown.length === 0 ? (
        <Panel className="space-y-3">
          <p className="text-ink-2">
            {tab === "upcoming" ? "No upcoming exams" : "No archived exams"}
          </p>
          {tab === "upcoming" && <Button onClick={() => setDialog({ kind: "add" })}>Add exam</Button>}
        </Panel>
      ) : (
        <ul role="tabpanel" className="space-y-2">
          {shown.map((row) => {
            const subject = subjects.find((entry) => entry.id === row.subjectId);
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-line bg-surface p-3"
              >
                <SubjectDot colour={subject?.colour ?? "teal"} />
                <a
                  href={`/exams/${row.id}`}
                  className="inline-flex min-h-11 items-center text-[15px] font-semibold text-ink hover:text-primary"
                >
                  {row.title}
                </a>
                <p className="w-full text-sm text-muted sm:w-auto">
                  {subject?.name ?? "Subject"}: {formatExamDate(row.examDate)}
                  {row.state === "upcoming" && countdownText(row) !== "" && ` · ${countdownText(row)}`}
                  {row.state === "upcoming" && ` · ${countText(row.topicCount, "topic", "topics")}, ${row.completedCount} done`}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  {row.state === "archived" && (
                    <Button
                      variant="secondary"
                      pending={pending}
                      onClick={() => setDialog({ kind: "edit", row })}
                    >
                      Change date
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "archived" && hasMore && (
        <Button
          variant="secondary"
          pending={loadingMore}
          onClick={async () => {
            setLoadingMore(true);
            const page = await loadArchived(nextCursor);
            setLoadingMore(false);
            if (page === null) return;
            setArchived((rows) => [...(rows ?? []), ...page.data]);
            setNextCursor(page.page.nextCursor);
            setHasMore(page.page.hasMore);
          }}
        >
          Load more
        </Button>
      )}

      {dialog?.kind === "add" && (
        <ExamDialog
          title="Add exam"
          subjects={subjects.map((subject) => ({
            id: subject.id,
            name: subject.name,
            colour: subject.colour,
          }))}
          submitLabel="Add exam"
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => {
            const result = await apiRequest<ExamListItem>("/api/app/exams", {
              method: "POST",
              headers: { "idempotency-key": crypto.randomUUID() },
              body: fields,
            });
            if (result.ok) {
              setDialog(null);
              await loadUpcoming();
              return null;
            }
            return result.failure;
          }}
        />
      )}

      {dialog?.kind === "edit" && (
        <ExamDialog
          title="Change exam date"
          intro="An archived exam only accepts a date change. Pick today or a later date to bring it back to the upcoming list."
          subjects={[]}
          initial={{ examDate: dialog.row.examDate }}
          dateOnly
          submitLabel="Save date"
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => {
            const failure = await save(dialog.row, { examDate: fields.examDate });
            if (failure === null) setDialog(null);
            return failure;
          }}
        />
      )}
    </div>
  );
}