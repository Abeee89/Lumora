"use client";

import { useCallback, useEffect, useState } from "react";

import type { Exam, ExamChecklistItem } from "@/modules/exams/public";
import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ButtonLink, Checkbox, ErrorPanel } from "../control";
import { Dialog } from "../dialog";
import { countText, formatLocalDate } from "../format";
import { messageFor } from "../messages";
import { failureBody } from "./feedback";
import { ExamDialog } from "./exam-dialog";

interface TopicsPage {
  data: { id: string; name: string }[];
}

type DialogState = { kind: "changeDate" } | { kind: "editTopics" } | null;

/** A-13 Exam detail (FR-122, FR-123, FR-125). */
export function ExamWorkspace({
  exam: initial,
  subjectName,
}: {
  exam: Exam;
  subjectName: string;
}) {
  const [exam, setExam] = useState(initial);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  const archived = exam.state === "archived";

  const refresh = useCallback(async () => {
    const result = await apiRequest<Exam>(`/api/app/exams/${initial.id}`, { method: "GET" });
    if (!result.ok) {
      setFailure(result.failure);
      return;
    }
    setExam(result.data);
    document.title = `${result.data.title} · Lumora`;
  }, [initial.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const countdownText =
    exam.countdown === null ? "" : exam.countdown.isToday ? "Today" : `${exam.countdown.daysRemaining} days to go`;

  const toggle = async (item: ExamChecklistItem, checked: boolean) => {
    const result = await apiRequest<Exam>(`/api/app/exams/${exam.id}/topics/${item.topicId}`, {
      method: "PUT",
      body: { completed: checked },
    });
    if (result.ok) {
      setExam(result.data);
      return;
    }
    setFailure(result.failure);
  };

  if (failure !== null) {
    return (
      <ErrorPanel title="Could not load this exam" body={failureBody(failure)} requestId={failure.requestId} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
            {exam.title}
          </h1>
          <p className="text-sm text-ink-2">
            {subjectName} · {formatLocalDate(exam.examDate)}
            {countdownText !== "" && ` · ${countdownText}`}
          </p>
        </div>
        {archived ? (
          <Button onClick={() => setDialog({ kind: "changeDate" })}>Change date</Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {/* A-13: the plan page opens with this subject preselected. */}
            <ButtonLink href={`/plan?subjectId=${exam.subjectId}`} variant="secondary">
              Plan study sessions
            </ButtonLink>
            <Button onClick={() => setDialog({ kind: "editTopics" })}>Edit topics</Button>
          </div>
        )}
      </div>

      <div className="rounded-card border border-line bg-surface p-3">
        <h2 className="text-base font-semibold text-ink">
          Checklist · {countText(exam.checklist.length, "topic", "topics")},{" "}
          {exam.checklist.filter((item) => item.completed).length} done
        </h2>
        {exam.checklist.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">
            {archived
              ? "This exam has no topics on its checklist."
              : "No topics on the checklist yet. Add topics so you can tick them off."}
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {exam.checklist.map((item) => (
              <li key={item.topicId} className="py-1">
                <Checkbox
                  id={`check-${item.topicId}`}
                  checked={item.completed}
                  onChange={(checked) => void toggle(item, checked)}
                >
                  {item.name}
                </Checkbox>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog?.kind === "changeDate" && (
        <ExamDialog
          title="Change exam date"
          intro="Pick today or a later date to bring this exam back to the upcoming list."
          subjects={[]}
          initial={{ examDate: exam.examDate }}
          dateOnly
          submitLabel="Save date"
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => {
            const result = await apiRequest<Exam>(`/api/app/exams/${exam.id}`, {
              method: "PATCH",
              headers: { "if-match": `"${exam.version}"` },
              body: { examDate: fields.examDate },
            });
            if (result.ok) {
              setDialog(null);
              await refresh();
              return null;
            }
            return result.failure;
          }}
        />
      )}

      {dialog?.kind === "editTopics" && (
        <EditTopicsDialog
          exam={exam}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

/** FR-122: replace the checklist from the subject's active topics; the server keeps `completed`. */
function EditTopicsDialog({
  exam,
  onClose,
  onSaved,
}: {
  exam: Exam;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [topics, setTopics] = useState<{ id: string; name: string }[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(exam.checklist.map((item) => item.topicId)));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadTopics = useCallback(async () => {
    const result = await apiRequest<TopicsPage>(`/api/app/subjects/${exam.subjectId}/topics`, {
      method: "GET",
    });
    if (result.ok) setTopics(result.data.data);
  }, [exam.subjectId]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  const toggle = (topicId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  return (
    <Dialog open title="Edit topics" onClose={onClose}>
      {error !== null && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
      {topics === null ? (
        <p className="text-sm text-ink-2">Loading topics...</p>
      ) : topics.length === 0 ? (
        <p className="text-sm text-ink-2">
          This subject has no topics yet. Add topics under the subject first.
        </p>
      ) : (
        <ul className="space-y-1">
          {topics.map((topic) => (
            <li key={topic.id} className="py-1">
              <Checkbox
                id={`pick-${topic.id}`}
                checked={selected.has(topic.id)}
                onChange={() => toggle(topic.id)}
              >
                {topic.name}
              </Checkbox>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          pending={pending}
          disabled={topics === null}
          onClick={async () => {
            setPending(true);
            const result = await apiRequest<Exam>(`/api/app/exams/${exam.id}/topics`, {
              method: "PUT",
              body: { topicIds: [...selected] },
            });
            setPending(false);
            if (result.ok) {
              onSaved();
              return;
            }
            setError(messageFor(result.failure.code, result.failure.message));
          }}
        >
          Save topics
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}