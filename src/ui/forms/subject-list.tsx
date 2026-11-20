"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { SubjectListItem } from "@/modules/subjects/public";
import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ErrorPanel, Panel } from "../control";
import { Dialog } from "../dialog";
import { countText } from "../format";
import { messageFor } from "../messages";
import { SubjectDot } from "../subject-dot";
import { failureBody } from "./feedback";
import { SubjectDialog, type PaletteEntry } from "./subject-dialog";

type DialogState =
  | { kind: "add" }
  | { kind: "edit"; row: SubjectListItem }
  | { kind: "archive"; row: SubjectListItem }
  | { kind: "rename"; row: SubjectListItem }
  | null;

/** A-7 Subjects (FR-010 to FR-014). */
export function SubjectList({ palette }: { palette: readonly PaletteEntry[] }) {
  const [rows, setRows] = useState<SubjectListItem[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [actionFailure, setActionFailure] = useState<ApiFailure | null>(null);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFailure(null);
    const result = await apiRequest<{ data: SubjectListItem[] }>(
      "/api/app/subjects?includeArchived=true",
      { method: "GET" },
    );
    if (result.ok) {
      setRows(result.data.data);
      return;
    }
    setRows([]);
    setFailure(result.failure);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = (rows ?? []).filter((row) => row.archivedAt === null);
  const archived = (rows ?? []).filter((row) => row.archivedAt !== null);
  const shown = tab === "active" ? active : archived;

  const runAction = async (
    id: string,
    action: () => Promise<{ ok: true } | { ok: false; failure: ApiFailure }>,
  ): Promise<ApiFailure | null> => {
    setPending(id);
    setActionFailure(null);
    setMenuFor(null);
    const result = await action();
    setPending(null);
    if (result.ok) {
      await load();
      return null;
    }
    setActionFailure(result.failure);
    return result.failure;
  };

  const move = async (row: SubjectListItem, delta: -1 | 1) => {
    const index = active.findIndex((entry) => entry.id === row.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= active.length) return;
    const ids = active.map((entry) => entry.id);
    const [moved] = ids.splice(index, 1);
    if (moved === undefined) return;
    ids.splice(target, 0, moved);

    await runAction(row.id, async () => {
      const result = await apiRequest<unknown>("/api/app/subjects/order", {
        method: "PUT",
        body: { subjectIds: ids },
      });
      return result.ok ? { ok: true } : { ok: false, failure: result.failure };
    });
  };

  const archive = async (row: SubjectListItem) => {
    setDialog(null);
    await runAction(row.id, async () => {
      const result = await apiRequest<unknown>(`/api/app/subjects/${row.id}/archive`, {
        method: "POST",
        headers: { "if-match": `"${row.version}"` },
      });
      return result.ok ? { ok: true } : { ok: false, failure: result.failure };
    });
  };

  const restore = async (row: SubjectListItem) => {
    const failed = await runAction(row.id, async () => {
      const result = await apiRequest<unknown>(`/api/app/subjects/${row.id}/restore`, {
        method: "POST",
        headers: { "if-match": `"${row.version}"` },
      });
      return result.ok ? { ok: true } : { ok: false, failure: result.failure };
    });
    if (failed?.code === "name_conflict") setDialog({ kind: "rename", row });
  };

  if (failure !== null) {
    return (
      <ErrorPanel
        title="We could not load your subjects"
        body={messageFor(failure.code, failure.message)}
        requestId={failure.requestId}
        action={<Button onClick={() => void load()}>Retry</Button>}
      />
    );
  }

  if (rows === null) {
    return (
      <div aria-busy="true" className="space-y-2">
        <p role="status" className="sr-only">
          Loading subjects
        </p>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="h-12 rounded-card border border-line bg-sunken" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Subject lists" className="flex gap-1">
          {(["active", "archived"] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              tabIndex={tab === name ? 0 : -1}
              onClick={() => setTab(name)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const next = name === "active" ? "archived" : "active";
                setTab(next);
                // ARIA tabs pattern: the arrow keys move focus with the selection.
                const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  "[role='tab']",
                );
                tabs?.[next === "active" ? 0 : 1]?.focus();
              }}
              className={`inline-flex min-h-11 items-center rounded-lg px-4 text-[15px] ${
                tab === name
                  ? "bg-primary-soft font-semibold text-on-primary-soft"
                  : "text-ink-2 hover:text-primary"
              }`}
            >
              {name === "active" ? "Active" : "Archived"}
            </button>
          ))}
        </div>
        <Button onClick={() => setDialog({ kind: "add" })}>Add subject</Button>
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
            {tab === "active" ? "No subjects yet" : "No archived subjects"}
          </p>
          {tab === "active" && (
            <Button onClick={() => setDialog({ kind: "add" })}>Add subject</Button>
          )}
        </Panel>
      ) : (
        <ul role="tabpanel" className="space-y-2">
          {shown.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-line bg-surface p-3"
            >
              <SubjectDot colour={row.color} />
              <a
                href={`/subjects/${row.id}`}
                className="inline-flex min-h-11 items-center text-[15px] font-semibold text-ink hover:text-primary"
              >
                {row.name}
              </a>
              <p className="w-full text-sm text-muted sm:w-auto">
                {countText(row.topicCount, "topic", "topics")}, {row.doneTopicCount} done
              </p>

              <div
                className="relative ml-auto"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setMenuFor(null);
                }}
              >
                <Button
                  variant="secondary"
                  ariaLabel={`Actions for ${row.name}`}
                  pending={pending === row.id}
                  onClick={() => setMenuFor(menuFor === row.id ? null : row.id)}
                >
                  Actions
                </Button>
                {menuFor === row.id && (
                  <ul className="absolute right-0 z-10 mt-1 w-48 rounded-card border border-line bg-surface p-1">
                    <MenuItem
                      onClick={() => {
                        setMenuFor(null);
                        setDialog({ kind: "edit", row });
                      }}
                    >
                      Edit
                    </MenuItem>
                    {row.archivedAt === null ? (
                      <>
                        <MenuItem
                          disabled={active[0]?.id === row.id}
                          onClick={() => void move(row, -1)}
                        >
                          Move up
                        </MenuItem>
                        <MenuItem
                          disabled={active[active.length - 1]?.id === row.id}
                          onClick={() => void move(row, 1)}
                        >
                          Move down
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            setMenuFor(null);
                            setDialog({ kind: "archive", row });
                          }}
                        >
                          Archive
                        </MenuItem>
                      </>
                    ) : (
                      <MenuItem onClick={() => void restore(row)}>Restore</MenuItem>
                    )}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialog?.kind === "add" && (
        <SubjectDialog
          title="Add subject"
          palette={palette}
          submitLabel="Add subject"
          onClose={() => setDialog(null)}
          onSubmit={async (name, colour) => {
            const result = await apiRequest<unknown>("/api/app/subjects", {
              method: "POST",
              headers: { "idempotency-key": crypto.randomUUID() },
              body: { name, color: colour },
            });
            if (result.ok) {
              setDialog(null);
              await load();
              return null;
            }
            return result.failure;
          }}
        />
      )}

      {dialog?.kind === "edit" && (
        <SubjectDialog
          title={`Edit ${dialog.row.name}`}
          palette={palette}
          initialName={dialog.row.name}
          initialColour={dialog.row.color}
          colourLocked={dialog.row.archivedAt !== null}
          colourLockedHint="An archived subject keeps its colour until you restore it."
          submitLabel="Save changes"
          onClose={() => setDialog(null)}
          onSubmit={async (name, colour) => {
            const body: Record<string, unknown> = { name };
            if (dialog.row.archivedAt === null) body["color"] = colour;
            const result = await apiRequest<unknown>(`/api/app/subjects/${dialog.row.id}`, {
              method: "PATCH",
              headers: { "if-match": `"${dialog.row.version}"` },
              body,
            });
            if (result.ok) {
              setDialog(null);
              await load();
              return null;
            }
            return result.failure;
          }}
        />
      )}

      {dialog?.kind === "archive" && (
        <Dialog open title={`Archive ${dialog.row.name}?`} onClose={() => setDialog(null)}>
          <p className="text-ink-2">
            Sessions and statistics keep this subject and label it as archived. It disappears from
            pickers until you restore it.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button pending={pending === dialog.row.id} onClick={() => void archive(dialog.row)}>
              Archive subject
            </Button>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
          </div>
        </Dialog>
      )}

      {dialog?.kind === "rename" && (
        <SubjectDialog
          title="Rename before restoring"
          intro="An active subject already uses this name. Give the archived subject a different name, then it is restored."
          palette={palette}
          initialName={dialog.row.name}
          initialColour={dialog.row.color}
          colourLocked
          submitLabel="Rename and restore"
          onClose={() => setDialog(null)}
          onSubmit={async (name) => {
            const renamed = await apiRequest<{ version: number }>(
              `/api/app/subjects/${dialog.row.id}`,
              {
                method: "PATCH",
                headers: { "if-match": `"${dialog.row.version}"` },
                body: { name },
              },
            );
            if (!renamed.ok) return renamed.failure;

            const restored = await apiRequest<unknown>(
              `/api/app/subjects/${dialog.row.id}/restore`,
              {
                method: "POST",
                headers: { "if-match": `"${renamed.data.version}"` },
              },
            );
            if (restored.ok) {
              setDialog(null);
              setTab("active");
              await load();
              return null;
            }
            return restored.failure;
          }}
        />
      )}
    </div>
  );
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
