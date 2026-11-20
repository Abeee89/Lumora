"use client";

import { useState } from "react";

import { Hint, Label, controlBorder } from "./control";

/** DESIGN-SYSTEM section 2.13: paste stays allowed, and the toggle is a real control. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  hint,
  error,
  autoComplete,
  countRule,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  hint?: string;
  error?: string | null;
  autoComplete: "new-password" | "current-password";
  countRule?: { minLength: number };
}) {
  const [visible, setVisible] = useState(false);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint === undefined ? null : hintId, error ? errorId : null]
    .filter((entry): entry is string => entry !== null)
    .join(" ");

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy === "" ? undefined : describedBy}
          className={`w-full rounded-lg bg-surface py-2 pl-3 pr-24 text-[16px] text-ink ${controlBorder(
            Boolean(error),
          )}`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-ink-2 hover:text-primary"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {hint !== undefined && (
        <Hint id={hintId}>
          {hint}
          {countRule !== undefined && (
            <span className="tabular">
              {" "}
              {value.length}/{countRule.minLength}
            </span>
          )}
        </Hint>
      )}
      {error != null && (
        <p className="text-sm font-semibold text-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}