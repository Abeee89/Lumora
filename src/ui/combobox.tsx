"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Hint, Label, controlBorder } from "./control";

/**
 * ARIA 1.2 combobox for the time zone fields (DESIGN-SYSTEM section 2.2). Type to filter,
 * ArrowDown and ArrowUp move the active option, Enter selects, Escape closes and keeps the
 * typed text, blur decides whether the typed value is a real zone.
 */

const FALLBACK_ZONES = [
  "Africa/Johannesburg",
  "America/Chicago",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Warsaw",
  "UTC",
];

function zoneList(): string[] {
  try {
    const zones = Intl.supportedValuesOf("timeZone");
    return zones.length > 0 ? zones : FALLBACK_ZONES;
  } catch {
    return FALLBACK_ZONES;
  }
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** `null` when the value is a zone this browser can name; a message otherwise. */
export function timeZoneError(value: string): string | null {
  if (value.trim() === "") return "Enter a time zone.";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return null;
  } catch {
    return "Choose a time zone from the list.";
  }
}

export function TimeZoneCombobox({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  hint?: string;
}) {
  const zones = useMemo(zoneList, []);
  const listId = `${id}-listbox`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const uid = useId();

  const matches = useMemo(() => {
    const needle = value.trim().toLowerCase();
    const filtered =
      needle === ""
        ? zones
        : zones.filter((zone) => zone.toLowerCase().includes(needle.replace(/[\s_]+/g, "/")));
    return filtered.slice(0, 50);
  }, [value, zones]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const describedBy = [hint === undefined ? null : hintId, error ? errorId : null]
    .filter((entry): entry is string => entry !== null)
    .join(" ");

  const activeId = open && matches[active] !== undefined ? `${listId}-option-${active}` : undefined;

  return (
    <div className="space-y-1" ref={wrapper}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy === "" ? undefined : describedBy}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            onBlur?.();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActive((current) => {
                const next = event.key === "ArrowDown" ? current + 1 : current - 1;
                if (next < 0) return matches.length - 1;
                if (next >= matches.length) return 0;
                return next;
              });
              return;
            }
            if (event.key === "Enter" && open && matches[active] !== undefined) {
              event.preventDefault();
              onChange(matches[active] as string);
              setOpen(false);
              return;
            }
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`block min-h-11 w-full rounded-lg bg-surface px-3 py-2 text-[16px] text-ink ${controlBorder(
            error !== null && error !== undefined,
          )}`}
        />
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          hidden={!open || matches.length === 0}
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line-strong bg-surface py-1 shadow-lg"
        >
          {matches.map((zone, index) => (
            <li
              key={`${uid}-${zone}`}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === active}
              onPointerDown={(event) => {
                event.preventDefault();
                onChange(zone);
                setOpen(false);
              }}
              onPointerEnter={() => setActive(index)}
              className={`min-h-11 cursor-pointer px-3 py-2 text-[15px] ${
                index === active ? "bg-primary-soft text-on-primary-soft" : "text-ink"
              }`}
            >
              {zone}
            </li>
          ))}
        </ul>
      </div>
      {hint !== undefined && <Hint id={hintId}>{hint}</Hint>}
      {error != null && (
        <p className="text-sm font-semibold text-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}