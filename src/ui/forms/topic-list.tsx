"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { Subject } from "@/modules/subjects/public";
import type { Topic } from "@/modules/topics/public";
import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ErrorPanel, FieldError, Label, Panel, SelectInput, TextInput, formId } from "../control";
import { Dialog } from "../dialog";
import { countText } from "../format";
import { messageFor } from "../messages";
import { failureBody } from "./feedback";
import { TopicEditDialog } from "./topic-edit-dialog";
import { TopicPasteDialog } from "./topic-paste-dialog";

const statusOptions: readonly { value: string; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

type DialogState = { kind: "edit"; topic: Topic } | { kind: "archive"; topic: Topic } | { kind: "paste" } | null;

/** A-8 topics column (FR-015 to FR-019, NFR-042). */
export function TopicList({ subject }: { subject: Subject }) {
  const readOnly = subject.archivedAt !== null;
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [actionFailure, setActionFailure] = useState<ApiFailure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);

  const subjectId = subject.id;

  const load = useCallback(async () => {
    setFailure(null);
    const result = await apiRequest<{ data: Topic[] }>(
      `/api/app/subjects/${subjectId}/topics?includeArchived=true`,
      { method: "GET" },
    );
    if (result.ok) {
      setTopics(result.data.data);
      return;
    }
    setTopics([]);
    setFailure(result.failure);
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = (topics ?? []).filter((topic) => topic.archivedAt === null);
  const archived = (topics ?? []).filter((topic) => topic.archivedAt !== null);
  const doneCount = active.filter((topic) => topic.status === "done").length;

  const runTopicAction = async (
    id: string,
    action: () => Promise<{ ok: true } | { ok: false; failure: ApiFailure }>,
  ): Promise<void> => {
    setPending(id);
    setActionFailure(null);
    setNotice(null);
    setMenuFor(null);
    const result = await action();
    setPending(null);
    if (result.ok) {
      await load();
      return;
    }
    setActionFailure(result.failure);
  };

  const patchTopic = async (
    topic: Topic,
    patch: Record<string, unknown>,
  ): Promise<ApiFailure | null> => {
    setPending(topic.id);
    setActionFailure(null);
    setNotice(null);
    setMenuFor(null);
    const result = await apiRequest<unknown>(`/api/app/topics/${topic.id}`, {
      method: "PATCH",
      headers: { "if-match": `"${topic.version}"` },
      body: patch,
    });
    setPending(null);
    if (result.ok) {
      await load();
      return null;
    }
    setActionFailure(result.failure);
    return result.failure;
  };

  const move = async (topic: Topic, delta: -1 | 1) => {
    const index = active.findIndex((entry) => entry.id === topic.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= active.length) return;
    const ids = active.map((entry) => entry.id);
    const [moved] = ids.splice(index, 1);
    if (moved === undefined) return;
    ids.splice(target, 0, moved);

    await runTopicAction(topic.id, async () => {
      const result = await apiRequest<unknown>(`/api/app/subjects/${subjectId}/topics/order`, {
        method: "PUT",
        body: { topicIds: ids },
      });
      return result.ok ? { ok: true as const } : { ok: false as const, failure: result.failure };
    });
  };

  const archive = (topic: Topic) => {
    setDialog(null);
    void runTopicAction(topic.id, async () => {
      const result = await apiRequest<unknown>(`/api/app/topics/${topic.id}/archive`, {
        method: "POST",
        headers: { "if-match": `"${topic.version}"` },
      });
      return result.ok ? { ok: true as const } : { ok: false as const, failure: result.failure };
    });
  };

  const restore = (topic: Topic) =>
    runTopicAction(topic.id, async () => {
      const result = await apiRequest<unknown>(`/api/app/topics/${topic.id}/restore`, {
        method: "POST",
        headers: { "if-match": `"${topic.version}"` },
      });
      return result.ok ? { ok: true as const } : { ok: false as const, failure: result.failure };
    });

  const addTopic = async () => {
    const name = addName.trim();
    if (name.length < 1 || name.length > 150) {
      setAddError("Enter a name of 1 to 150 characters.");
      return;
    }
    setAddError(null);
    setAddPending(true);
    setActionFailure(null);
    const result = await apiRequest<unknown>(`/api/app/subjects/${subjectId}/topics`, {
      method: "POST",
      headers: { "idempotency-key": crypto.randomUUID() },
      body: { name },
    });
    setAddPending(false);
    if (!result.ok) {
      setActionFailure(result.failure);
      return;
    }
    setAddName("");
    await load();
  };

  if (failure !== null) {
    return (
      <ErrorPanel
        title="We could not load the topics"
        body={messageFor(failure.code, failure.message)}
        requestId={failure.requestId}
        action={<Button onClick={() => void load()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="topics-heading" className="text-lg font-semibold text-ink">
            Topics
          </h2>
          {!readOnly && (
            <Button variant="secondary" onClick={() => setDialog({ kind: "paste" })}>
              Paste a list
            </Button>
          )}
        </div>

        {actionFailure !== null && (
          <ErrorPanel
            title={actionFailure.code === "input_too_large" ? "That paste is too long" : "That did not work"}
            body={failureBody(actionFailure)}
            requestId={actionFailure.requestId}
          />
        )}
        {notice !== null && (
          <p role="status" className="text-sm text-ink-2">
            {notice}
          </p>
        )}

        {topics === null ? (
          <div aria-busy="true" className="space-y-2">
            <p role="status" className="sr-only">
              Loading topics
            </p>
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="h-12 rounded-card border border-line bg-sunken" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <Panel className="space-y-2">
            <p className="text-ink-2">No topics yet</p>
            <p className="text-sm text-muted">
              A topic is what a study session is spent on. Add one below, or paste a whole list.
            </p>
          </Panel>
        ) : (
          <ul className="space-y-2">
            {active.map((topic) => (
              <li
                key={topic.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-line bg-surface p-3"
              >
                <span className="text-[15px] font-semibold text-ink">{topic.name}</span>
                <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-2">
                  Weight {topic.weight}
                </span>

                <div className="w-full sm:w-40">
                  <label className="sr-only" htmlFor={topicId(topic.id)}>
                    Status for {topic.name}
                  </label>
                  <SelectInput
                    id={topicId(topic.id)}
                    value={topic.status}
                    onChange={(value) => void patchTopic(topic, { status: value })}
                    options={statusOptions}
                    disabled={readOnly}
                  />
                </div>

                <div
                  className="relative ml-auto"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setMenuFor(null);
                  }}
                >
                  <Button
                    variant="secondary"
                    ariaLabel={`Actions for ${topic.name}`}
                    pending={pending === topic.id}
                    disabled={readOnly}
                    onClick={() => setMenuFor(menuFor === topic.id ? null : topic.id)}
                  >
                    Actions
                  </Button>
                  {menuFor === topic.id && (
                    <ul className="absolute right-0 z-10 mt-1 w-48 rounded-card border border-line bg-surface p-1">
                      <MenuItem
                        onClick={() => {
                          setMenuFor(null);
                          setDialog({ kind: "edit", topic });
                        }}
                      >
                        Edit
                      </MenuItem>
                      <MenuItem
                        disabled={active[0]?.id === topic.id}
                        onClick={() => void move(topic, -1)}
                      >
                        Move up
                      </MenuItem>
                      <MenuItem
                        disabled={active[active.length - 1]?.id === topic.id}
                        onClick={() => void move(topic, 1)}
                      >
                        Move down
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          setMenuFor(null);
                          setDialog({ kind: "archive", topic });
                        }}
                      >
                        Archive
                      </MenuItem>
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!readOnly && (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void addTopic();
            }}
            className="space-y-1"
          >
            <Label htmlFor={formId("newTopic")}>New topic</Label>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-0 flex-1">
                <TextInput
                  id={formId("newTopic")}
                  type="text"
                  value={addName}
                  onChange={(value) => {
                    setAddName(value);
                    setAddError(null);
                  }}
                  invalid={addError !== null}
                  describedBy={addError === null ? undefined : "new-topic-error"}
                  placeholder="Fractions"
                />
              </div>
              <Button type="submit" pending={addPending}>
                Add topic
              </Button>
            </div>
            {addError !== null && <FieldError id="new-topic-error">{addError}</FieldError>}
          </form>
        )}

        {archived.length > 0 && (
          <details className="rounded-card border border-line bg-surface p-4">
            <summary className="min-h-11 cursor-pointer text-[15px] font-semibold text-ink">
              Archived topics ({archived.length})
            </summary>
            <ul className="mt-3 space-y-2">
              {archived.map((topic) => (
                <li key={topic.id} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-[15px] text-ink-2">{topic.name}</span>
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                    Weight {topic.weight}
                  </span>
                  <span className="ml-auto">
                    <Button
                      variant="secondary"
                      pending={pending === topic.id}
                      disabled={readOnly}
                      onClick={() => void restore(topic)}
                    >
                      Restore
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <aside className="space-y-4 lg:col-span-4">
        <Panel className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Summary</h2>
          {topics === null ? (
            <p aria-busy="true" className="text-sm text-muted">
              Loading counts
            </p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-2">Topics</dt>
                <dd className="font-semibold text-ink">{active.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-2">Done</dt>
                <dd className="font-semibold text-ink">{doneCount}</dd>
              </div>
              {archived.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-2">Archived</dt>
                  <dd className="font-semibold text-ink">{archived.length}</dd>
                </div>
              )}
            </dl>
          )}
          <p className="text-sm text-muted">
            Studied time, the subject goal, notes and exams join this column later.
          </p>
        </Panel>
      </aside>

      {dialog?.kind === "edit" && (
        <TopicEditDialog
          topic={dialog.topic}
          onClose={() => setDialog(null)}
          onSubmit={(name, weight) => patchTopic(dialog.topic, { name, weight })}
        />
      )}

      {dialog?.kind === "archive" && (
        <Dialog open title={`Archive ${dialog.topic.name}?`} onClose={() => setDialog(null)}>
          <p className="text-ink-2">
            Sessions that used this topic keep it, labelled as archived. It leaves the pickers
            until you restore it.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button pending={pending === dialog.topic.id} onClick={() => archive(dialog.topic)}>
              Archive topic
            </Button>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
          </div>
        </Dialog>
      )}

      {dialog?.kind === "paste" && (
        <TopicPasteDialog
          subjectId={subjectId}
          onClose={() => setDialog(null)}
          onAdded={async (created) => {
            setDialog(null);
            setNotice(`Added ${countText(created, "topic", "topics")}`);
            await load();
          }}
        />
      )}
    </div>
  );
}

function topicId(id: string): string {
  return `topic-status-${id}`;
}

function MenuItem({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean | undefined;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="block w-full min-h-11 rounded px-3 text-left text-[15px] text-ink hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </button>
    </li>
  );
}

