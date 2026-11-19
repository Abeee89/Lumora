"use client";

import { useEffect, useState } from "react";

/**
 * SY-2. Next hands the server digest to this boundary for unexpected failures.
 * The request id is shown only when a digest exists; a fabricated id would be worse
 * than no caption.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // A11Y-BASE: the document title names the screen. The failing page supplied its own
    // metadata, which no longer describes what is on screen.
    document.title = "Something went wrong · Lumora";
    setPending(false);
  }, [error]);

  return (
    <div className="mx-auto max-w-[560px]">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Something went wrong
      </h1>
      <p role="alert" className="mt-3 text-ink-2">
        The page did not load. Try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => {
          setPending(true);
          reset();
        }}
        disabled={pending}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-card)] bg-primary px-5 text-base font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60 md:w-auto"
      >
        {pending ? "Trying again" : "Retry"}
      </button>
      {error.digest !== undefined && (
        <p className="tabular mt-6 text-sm text-muted">Request ID: {error.digest}</p>
      )}
    </div>
  );
}