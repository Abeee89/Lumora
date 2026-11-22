"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A native modal dialog: `showModal` gives the focus trap, the inert background and the
 * Escape key for free (R-26, A11Y-BASE). `onClose` fires for Escape as well as the close
 * button, so the parent keeps one source of truth for "is it open".
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  className = "",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Layout override; A-6 turns the entry form into a full-height sheet on mobile. */
  className?: string | undefined;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className={`m-auto w-[min(30rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-5 text-ink backdrop:bg-black/40 ${className}`}
    >
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </dialog>
  );
}
