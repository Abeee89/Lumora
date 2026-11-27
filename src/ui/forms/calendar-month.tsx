"use client";

import { useEffect, useRef, useState } from "react";

import type { CalendarDay, CalendarDayDetail, CalendarMonth } from "@/modules/calendar/public";
import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ButtonLink, ErrorPanel, Panel } from "../control";
import { failureBody } from "./feedback";
import { formatLocalDate, timeInZone } from "../format";

interface CalendarClientProps {
  initialMonth: CalendarMonth;
  today: string;
  timeZone: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const bucketLegend = [
  { bucket: "0", label: "0 min" },
  { bucket: "1_59", label: "1 to 59 min" },
  { bucket: "60_119", label: "60 to 119 min" },
  { bucket: "120_plus", label: "120+ min" },
] as const;

function monthLabel(month: string): string {
  const [year, number] = month.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, number - 1, 1)),
  );
}

/** `YYYY-MM` of the month `delta` away from `month`. */
function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function clampToMonth(month: string, date: string): string {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const day = Math.min(Number(date.slice(8)), daysInMonth);
  return `${month}-${String(day).padStart(2, "0")}`;
}
function dayGrid(month: string, today: string): (CalendarDay | "")[] {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const firstWeekday = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const cells: (CalendarDay | "")[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push("");
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    cells.push({ date, minutes: 0, bucket: "0", isToday: date === today });
  }
  while (cells.length < 42) cells.push("");
  return cells;
}

/** The bucket class: the four intensities of the legend (NFR-043, color never alone). */
function bucketClass(bucket: CalendarDay["bucket"]): string {
  switch (bucket) {
    case "1_59":
      return "bg-bucket-1";
    case "60_119":
      return "bg-bucket-2";
    case "120_plus":
      return "bg-bucket-3";
    default:
      return "bg-bucket-0";
  }
}

function minutesText(minutes: number): string {
  return minutes === 0 ? "" : `${minutes}m`;
}

export function CalendarClient({ initialMonth, today, timeZone }: CalendarClientProps) {
  const [month, setMonth] = useState(initialMonth.month);
  const [heatmap, setHeatmap] = useState<CalendarMonth>(initialMonth);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>(today);
  const [detail, setDetail] = useState<CalendarDayDetail | null>(null);
  const [detailFailure, setDetailFailure] = useState<ApiFailure | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLHeadingElement>(null);

  const loadMonth = async (requested: string): Promise<void> => {
    setLoading(true);
    setFailure(null);
    const result = await apiRequest<CalendarMonth>(`/api/app/calendar/heatmap?month=${requested}`, {
      method: "GET",
    });
    setLoading(false);
    if (result.ok) {
      setHeatmap(result.data);
    } else {
      setFailure(result.failure);
    }
  };

  const changeMonth = (delta: number): void => {
    const next = shiftMonth(month, delta);
    setMonth(next);
    void loadMonth(next);
  };
  const selectDay = (date: string): void => {
    setSelected(date);
    setDetail(null);
    setDetailFailure(null);
    void apiRequest<CalendarDayDetail>(`/api/app/calendar/days/${date}`, { method: "GET" }).then(
      (result) => {
        if (result.ok) setDetail(result.data);
        else setDetailFailure(result.failure);
      },
    );
  };
  const cells = dayGrid(month, today);
  const dayIndex = cells.findIndex((cell) => cell !== "" && cell.date === selected);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const current = dayIndex;
    if (current < 0) return;
    if (event.key === "PageUp") {
      event.preventDefault();
      selectDay(clampToMonth(shiftMonth(month, -1), selected));
      changeMonth(-1);
      return;
    }
    if (event.key === "PageDown") {
      event.preventDefault();
      selectDay(clampToMonth(shiftMonth(month, 1), selected));
      changeMonth(1);
      return;
    }
    const step =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -7
            : event.key === "ArrowDown"
              ? 7
              : event.key === "Home"
                ? -(current % 7)
                : event.key === "End"
                  ? 6 - (current % 7)
                  : null;
    if (step === null) return;
    event.preventDefault();
    const target = cells[current + step];
    if (typeof target === "string" || target === undefined) return;
    selectDay(target.date);
  };

  useEffect(() => {
    const cell = gridRef.current?.querySelector<HTMLButtonElement>(
      `[role="gridcell"][aria-label^="${selected}, "]`,
    );
    cell?.focus();
  }, [loading, month, selected]);
  useEffect(() => {
    if (window.matchMedia("(min-width: 900px)").matches) return;
    panelRef.current?.focus();
  }, [selected]);
  const heatmapByDate = new Map(heatmap.days.map((day) => [day.date, day]));
  const grid = dayGrid(month, today).map((cell) => {
    if (cell === "") return cell;
    const mapped = heatmapByDate.get(cell.date);
    return mapped === undefined ? cell : { ...cell, minutes: mapped.minutes, bucket: mapped.bucket, isToday: cell.isToday };
  });
  const activeLabel = (cell: CalendarDay): string => {
    const studied = cell.minutes === 0 ? "no minutes studied" : `${cell.minutes} minutes studied`;
    return `${cell.date}, ${studied}${cell.isToday ? ", today" : ""}`;
  };

  const detailDate = selected;
  const detailMinutes =
    detail === null ? 0 : detail.totalMinutes;
  const panelHeading = formatLocalDate(detailDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,720px)_360px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" ariaLabel="Previous month" onClick={() => changeMonth(-1)}>
            Previous
          </Button>
          <h2 role="status" aria-live="polite" className="min-w-36 text-center text-lg font-semibold text-ink">
            {monthLabel(month)}
          </h2>
          <Button variant="secondary" ariaLabel="Next month" onClick={() => changeMonth(1)}>
            Next
          </Button>
          <Button
            variant="secondary"
            ariaLabel="Go to today"
            onClick={() => {
              setMonth(today.slice(0, 7));
              void loadMonth(today.slice(0, 7));
              selectDay(today);
            }}
          >
            Today
          </Button>
        </div>
        <p className="text-sm text-ink-2">Times shown in {timeZone}.</p>

        {failure !== null ? (
          <ErrorPanel
            title="Could not load the calendar"
            body={failureBody(failure)}
            requestId={failure.requestId}
            action={
              <Button variant="secondary" onClick={() => void loadMonth(month)}>
                Try again
              </Button>
            }
          />
        ) : loading ? (
          <div aria-busy="true" className="grid grid-cols-7 gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41].map((index) => (
              <div key={index} className="h-10 rounded border border-line bg-sunken sm:h-14" />
            ))}
          </div>
        ) : (
          <div
            ref={gridRef}
            role="grid"
            aria-label={`Calendar for ${monthLabel(month)}`}
            className="grid grid-cols-7 gap-1"
            onKeyDown={onKeyDown}
          >
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="text-center text-xs font-semibold text-ink-2">
                {weekday}
              </div>
            ))}
            {grid.map((cell, index) =>
              cell === "" ? (
                <div key={index} className="h-10 sm:h-14" />
              ) : (
                <button
                  key={cell.date}
                  type="button"
                  role="gridcell"
                  aria-selected={cell.date === selected}
                  tabIndex={cell.date === selected ? 0 : -1}
                  aria-label={activeLabel(cell)}
                  onClick={() => selectDay(cell.date)}
                  className={`flex min-h-11 flex-col items-center justify-center rounded border text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    cell.date === selected ? "border-primary bg-primary-soft" : "border-line"
                  } ${bucketClass(cell.bucket)}`}
                  style={cell.isToday ? { outline: "2px solid var(--ink)" } : undefined}
                >
                  <span className="text-xs">{Number(cell.date.slice(8))}</span>
                  {cell.minutes > 0 && <span className="text-xs">{minutesText(cell.minutes)}</span>}
                </button>
              ),
            )}
          </div>
        )}

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          {bucketLegend.map((entry) => (
            <li key={entry.bucket} className="inline-flex items-center gap-1">
              <span className={`inline-block h-3 w-3 rounded ${bucketClass(entry.bucket)}`} />
              {entry.label}
            </li>
          ))}
        </ul>
      </div>

      <Panel className="min-w-0 space-y-4">
        <h2 ref={panelRef} tabIndex={-1} className="text-base font-semibold text-ink">
          {panelHeading}
        </h2>

        {detailFailure !== null ? (
          <ErrorPanel
            title="Could not load this day"
            body={failureBody(detailFailure)}
            requestId={detailFailure.requestId}
            action={
              <Button variant="secondary" onClick={() => selectDay(detailDate)}>
                Try again
              </Button>
            }
          />
        ) : detail === null ? (
          <p className="text-sm text-ink-2">Loading this day…</p>
        ) : (
          <>
            <p className="text-sm text-ink">
              <span className="font-semibold">{detailMinutes}</span> minutes studied
            </p>

            {detail.sessions.length === 0 && detail.planEntries.length === 0 ? (
              <p className="text-sm text-ink-2">No sessions or plans on this day</p>
            ) : (
              <div className="space-y-4">
                {detail.sessions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Sessions</h3>
                    <ul className="space-y-2">
                      {detail.sessions.map((session) => (
                        <li key={session.id} className="rounded border border-line bg-canvas p-2 text-sm">
                          <p className="font-medium text-ink">
                            {session.subjectName}
                            {session.subjectArchived && <span className="text-muted"> (archived)</span>}
                          </p>
                          <p className="text-xs text-ink-2">
                            {timeInZone(session.startedAt, timeZone)} to {timeInZone(session.endedAt, timeZone)}
                          </p>
                          <p className="text-xs text-ink-2">{Math.round(session.daySeconds / 60)} min</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detail.planEntries.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Plan</h3>
                    <ul className="space-y-2">
                      {detail.planEntries.map((entry) => (
                        <li key={entry.id} className="rounded border border-line bg-canvas p-2 text-sm">
                          <p className="font-medium text-ink">
                            {entry.subjectName}{" "}
                            <span className="text-xs text-ink-2">{timeInZone(entry.startsAt, timeZone)}</span>
                          </p>
                          <p className="text-xs text-ink-2">
                            {entry.actualSeconds > 0
                              ? `Planned ${entry.plannedMin} min · actual ${Math.round(entry.actualSeconds / 60)} min`
                              : `Planned ${entry.plannedMin} min`}
                          </p>
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                              entry.status === "done"
                                ? "bg-success-soft text-success"
                                : entry.status === "missed"
                                  ? "bg-error-soft text-error"
                                  : "bg-primary-soft text-primary"
                            }`}
                          >
                            {entry.status === "done" ? "Done" : entry.status === "missed" ? "Missed" : "Planned"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <ButtonLink href="/plan" wide>
              Add plan entry for this day
            </ButtonLink>
          </>
        )}
      </Panel>
    </div>
  );
}
