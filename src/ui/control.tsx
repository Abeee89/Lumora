import type { ReactNode } from "react";

/**
 * Token-styled controls (DESIGN-SYSTEM section 2.1 and 2.2). No "use client": every
 * component here is a plain function, so a form imports them without pulling hooks.
 * Hand-built rather than shadcn/ui for M02; the deviation and its reason are recorded in
 * 08-build/M02-EVIDENCE.md.
 */

const labelClass = "block text-sm font-semibold text-ink";

const controlClass =
  "block w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-[16px] text-ink " +
  "placeholder:text-muted disabled:bg-sunken";

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[15px] " +
  "font-semibold disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border border-line-strong bg-surface text-ink hover:text-primary",
} as const;

export function controlBorder(invalid: boolean): string {
  return invalid ? "border-2 border-error" : "border border-line-strong";
}

export function Label({
  htmlFor,
  children,
  optional = false,
}: {
  htmlFor: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label className={labelClass} htmlFor={htmlFor}>
      {children}
      {optional && <span className="font-normal text-muted"> (optional)</span>}
    </label>
  );
}

export function Hint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="text-sm text-muted" id={id}>
      {children}
    </p>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="text-sm font-semibold text-error" id={id}>
      {children}
    </p>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function Button({
  children,
  variant = "primary",
  pending = false,
  wide = false,
  type = "button",
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  variant?: keyof typeof buttonVariants | undefined;
  pending?: boolean | undefined;
  wide?: boolean | undefined;
  type?: "button" | "submit" | undefined;
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${buttonBase} ${buttonVariants[variant]} ${wide ? "w-full" : ""}`}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  wide = false,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonVariants | undefined;
  wide?: boolean | undefined;
}) {
  return (
    <a href={href} className={`${buttonBase} ${buttonVariants[variant]} ${wide ? "w-full" : ""}`}>
      {children}
    </a>
  );
}

export function TextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <a
      href={href}
      className={`text-primary underline underline-offset-2 hover:text-primary-hover ${className}`}
    >
      {children}
    </a>
  );
}

export function Panel({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "error" | undefined;
  className?: string | undefined;
}) {
  const background = tone === "error" ? "border-error bg-error-soft" : "border-line bg-surface";
  return (
    <section className={`rounded-card border ${background} p-5 ${className}`}>{children}</section>
  );
}

/** ERR-SECTION: the failed region only, with the request ID kept for support. */
export function ErrorPanel({
  title,
  body,
  requestId,
  action,
}: {
  title: string;
  body: string;
  requestId?: string | null | undefined;
  action?: ReactNode;
}) {
  return (
    <Panel tone="error" className="space-y-3">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="text-sm text-ink-2">{body}</p>
      {action}
      {requestId != null && requestId !== "" && (
        <p className="text-xs text-muted">
          Request ID <span className="font-mono">{requestId}</span>
        </p>
      )}
    </Panel>
  );
}

export function TextInput({
  id,
  type,
  value,
  onChange,
  onBlur,
  autoComplete,
  invalid = false,
  describedBy,
  placeholder,
}: {
  id: string;
  type: "text" | "email" | "password" | "number";
  value: string;
  onChange: (value: string) => void;
  onBlur?: (() => void) | undefined;
  autoComplete?: string | undefined;
  invalid?: boolean | undefined;
  describedBy?: string | undefined;
  placeholder?: string | undefined;
}) {
  return (
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      autoComplete={autoComplete}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`${controlClass} ${controlBorder(invalid)}`}
    />
  );
}

export function SelectInput({
  id,
  value,
  onChange,
  options,
  invalid = false,
  describedBy,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  invalid?: boolean | undefined;
  describedBy?: string | undefined;
  placeholder?: string | undefined;
}) {
  return (
    <select
      id={id}
      name={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`${controlClass} ${controlBorder(invalid)}`}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  invalid = false,
  describedBy,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  invalid?: boolean | undefined;
  describedBy?: string | undefined;
  children: ReactNode;
}) {
  return (
    // The row is the label, so the 24 px box is not the only target (NFR-087). The input
    // ignores pointer events: a click anywhere, the box included, activates the label once.
    <label className="flex min-h-11 w-fit items-center gap-3">
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`pointer-events-none size-6 shrink-0 rounded accent-primary ${
          invalid ? "border-2 border-error" : "border border-line-strong"
        }`}
      />
      <span className="text-[15px] text-ink">{children}</span>
    </label>
  );
}

/** Form body: single column, 12 px between fields (DESIGN-SYSTEM section 2.13). */
export function FormFields({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

export function formId(name: string): string {
  return `field-${name}`;
}