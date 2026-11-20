"use client";

import { useState } from "react";

import type { BulkTopicsPreview, Topic } from "@/modules/topics/public";
import { apiRequest, type ApiFailure } from "../api-client";
import { Button, Label, Textarea, formId } from "../control";
import { Dialog } from "../dialog";
import { countText } from "../format";
import { messageFor } from "../messages";

const pasteLimit = 200;

/**
 * TOP-03 (FR-017): a paste is previewed with a dry run before it is saved. The save is one
 * keyed request, so a retry never creates the list twice.
 */
export function TopicPasteDialog({
  subjectId,
  onClose,
  onAdded,
}: {
  subjectId: string;
  onClose: () => void;
  onAdded: (created: number) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<BulkTopicsPreview | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState<"preview" | "save" | null>(null);

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const requestPreview = async () => {
    setPending("preview");
    setFailure(null);
    const result = await apiRequest<BulkTopicsPreview>(
      `/api/app/subjects/${subjectId}/topics/bulk`,
      { method: "POST", body: { lines, dryRun: true } },
    );
    setPending(null);
    if (result.ok) {
      setPreview(result.data);
      return;
    }
    setPreview(null);
    setFailure(result.failure);
  };

  const save = async () => {
    setPending("save");
    setFailure(null);
    const result = await apiRequest<{ data: Topic[] }>(
      `/api/app/subjects/${subjectId}/topics/bulk`,
      {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: { lines, dryRun: false },
      },
    );
    setPending(null);
    if (result.ok) {
      await onAdded(result.data.data.length);
      return;
    }
    setPreview(null);
    setFailure(result.failure);
  };

  const toCreate = preview === null ? 0 : preview.valid.length + preview.duplicates.length;
  const blocked = preview === null || preview.tooLong.length > 0 || toCreate === 0;

  return (
    <Dialog open title="Paste a list of topics" onClose={onClose}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void requestPreview();
        }}
        className="space-y-4"
      >
        <div className="space-y-1">
          <Label htmlFor={formId("pasteLines")}>One topic per line</Label>
          <Textarea
            id={formId("pasteLines")}
            value={text}
            rows={8}
            onChange={(value) => {
              setText(value);
              setPreview(null);
              setFailure(null);
            }}
            describedBy="paste-lines-hint"
            invalid={failure !== null}
            placeholder={"Fractions\nDecimals\nLong division"}
          />
          <p className="text-sm text-muted" id="paste-lines-hint">
            Blank lines are ignored. One paste holds up to {pasteLimit} lines.
          </p>
        </div>

        {failure !== null && (
          <p role="alert" className="text-sm font-semibold text-error">
            {pasteFailureCopy(failure)}
          </p>
        )}

        {preview !== null && (
          <div className="space-y-3">
            <PreviewGroup title={`New (${preview.valid.length})`} items={preview.valid} />
            <PreviewGroup title={`Already there (${preview.duplicates.length})`} items={preview.duplicates} />
            {preview.tooLong.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-ink">
                  Too long ({preview.tooLong.length})
                </h3>
                <p className="text-sm text-error">
                  Shorten these to 150 characters or fewer, then preview again.
                </p>
                <PreviewGroup title="Too long" items={preview.tooLong} />
              </div>
            )}
            {preview.duplicates.length > 0 && (
              <p className="text-sm text-muted">
                Lines that are already there are added again as separate topics.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="secondary" pending={pending === "preview"}>
            Preview
          </Button>
          <Button pending={pending === "save"} disabled={blocked} onClick={() => void save()}>
            {toCreate === 0 ? "Save" : `Add ${countText(toCreate, "topic", "topics")}`}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function PreviewGroup({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) {
    return (
      <h3 className="text-sm font-semibold text-ink-2">
        {title}: none
      </h3>
    );
  }
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-ink-2">
        {items.map((item) => (
          <li key={item} className="truncate">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function pasteFailureCopy(failure: ApiFailure): string {
  if (failure.code === "input_too_large") {
    const limit = failure.details["limit"];
    const actual = failure.details["actual"];
    if (typeof limit === "number" && typeof actual === "number") {
      return `You pasted ${actual} lines. One paste holds up to ${limit}.`;
    }
  }
  if (failure.code === "validation_failed") {
    return "One line is longer than 150 characters. Shorten it and preview again.";
  }
  return messageFor(failure.code, failure.message);
}
