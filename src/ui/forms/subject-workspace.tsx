"use client";

import { useState } from "react";

import type { Subject } from "@/modules/subjects/public";
import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ErrorPanel } from "../control";
import { Dialog } from "../dialog";
import { SubjectDot } from "../subject-dot";
import { failureBody } from "./feedback";
import { SubjectDialog, type PaletteEntry } from "./subject-dialog";
import { TopicList } from "./topic-list";

type DialogState = "edit" | "archive" | "rename" | null;

/** A-8 Subject detail (FR-010, FR-011, FR-015 to FR-019). */
export function SubjectWorkspace({
  subject: initial,
  palette,
}: {
  subject: Subject;
  palette: readonly PaletteEntry[];
}) {
  const [subject, setSubject] = useState(initial);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);

  const archived = subject.archivedAt !== null;

  const refresh = async (next?: Subject) => {
    if (next !== undefined) {
      setSubject(next);
      document.title = `${next.name} · Lumora`;
      return;
    }
    const result = await apiRequest<Subject>(`/api/app/subjects/${initial.id}`, { method: "GET" });
    if (!result.ok) {
      setFailure(result.failure);
      return;
    }
    setSubject(result.data);
    document.title = `${result.data.name} · Lumora`;
  };

  const restore = async () => {
    setPending(true);
    setFailure(null);
    const result = await apiRequest<Subject>(`/api/app/subjects/${subject.id}/restore`, {
      method: "POST",
      headers: { "if-match": `"${subject.version}"` },
    });
    setPending(false);
    if (!result.ok) {
      setFailure(result.failure);
      if (result.failure.code === "name_conflict") setDialog("rename");
      return;
    }
    await refresh(result.data);
  };

  const archive = async () => {
    setDialog(null);
    setPending(true);
    setFailure(null);
    const result = await apiRequest<Subject>(`/api/app/subjects/${subject.id}/archive`, {
      method: "POST",
      headers: { "if-match": `"${subject.version}"` },
    });
    setPending(false);
    if (!result.ok) {
      setFailure(result.failure);
      return;
    }
    await refresh(result.data);
  };

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <a href="/subjects" className="hidden text-ink-2 hover:text-primary sm:inline-flex sm:min-h-11 sm:items-center">
          Subjects
        </a>
        <span aria-hidden="true" className="hidden text-muted sm:inline">
          {" / "}
        </span>
        <span className="hidden text-ink-2 sm:inline">{subject.name}</span>
        <a href="/subjects" className="inline-flex min-h-11 items-center text-ink-2 hover:text-primary sm:hidden">
          Back to Subjects
        </a>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <SubjectDot colour={subject.color} />
          <h1
            tabIndex={-1}
            className="min-w-0 truncate text-[28px] font-bold leading-9 text-ink outline-none"
          >
            {subject.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDialog("edit")}>
            Edit subject
          </Button>
          {archived ? (
            <Button pending={pending} onClick={() => void restore()}>
              Restore subject
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setDialog("archive")}>
              Archive subject
            </Button>
          )}
        </div>
      </div>

      {archived && (
        <p className="rounded-card border border-line bg-sunken p-3 text-sm text-ink-2">
          This subject is archived. Its topics stay readable and read only until you restore it.
        </p>
      )}

      {failure !== null && (
        <ErrorPanel
          title="That did not work"
          body={failureBody(failure)}
          requestId={failure.requestId}
        />
      )}

      <TopicList subject={subject} />

      {dialog === "edit" && (
        <SubjectDialog
          title={`Edit ${subject.name}`}
          palette={palette}
          initialName={subject.name}
          initialColour={subject.color}
          colourLocked={archived}
          colourLockedHint="An archived subject keeps its colour until you restore it."
          submitLabel="Save changes"
          onClose={() => setDialog(null)}
          onSubmit={async (name, colour) => {
            const body: Record<string, unknown> = { name };
            if (!archived) body["color"] = colour;
            const result = await apiRequest<Subject>(`/api/app/subjects/${subject.id}`, {
              method: "PATCH",
              headers: { "if-match": `"${subject.version}"` },
              body,
            });
            if (!result.ok) return result.failure;
            setDialog(null);
            await refresh(result.data);
            return null;
          }}
        />
      )}

      {dialog === "archive" && (
        <Dialog open title={`Archive ${subject.name}?`} onClose={() => setDialog(null)}>
          <p className="text-ink-2">
            Sessions and statistics keep this subject and label it as archived. It disappears
            from pickers until you restore it.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button pending={pending} onClick={() => void archive()}>
              Archive subject
            </Button>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
          </div>
        </Dialog>
      )}

      {dialog === "rename" && (
        <SubjectDialog
          title="Rename before restoring"
          intro="An active subject already uses this name. Give the archived subject a different name, then it is restored."
          palette={palette}
          initialName={subject.name}
          initialColour={subject.color}
          colourLocked
          submitLabel="Rename and restore"
          onClose={() => setDialog(null)}
          onSubmit={async (name) => {
            const renamed = await apiRequest<Subject>(`/api/app/subjects/${subject.id}`, {
              method: "PATCH",
              headers: { "if-match": `"${subject.version}"` },
              body: { name },
            });
            if (!renamed.ok) return renamed.failure;

            const restored = await apiRequest<Subject>(
              `/api/app/subjects/${subject.id}/restore`,
              {
                method: "POST",
                headers: { "if-match": `"${renamed.data.version}"` },
              },
            );
            if (!restored.ok) return restored.failure;
            setDialog(null);
            await refresh(restored.data);
            return null;
          }}
        />
      )}
    </div>
  );
}