/**
 * ADR-006: the only code allowed to turn instants into local dates.
 *
 * Invariants:
 * - Instants are stored and returned in UTC (`Date` is a UTC instant).
 * - A local date is derived from an IANA zone plus the user's rollover hour.
 * - The clock is injected; nothing here calls `Date.now()` except `systemClock`.
 *
 * date-fns-tz (ADR-006 item 6) supplies the zone conversions; no other module may
 * import it.
 */
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export const fixedClock = (instant: Date): Clock => ({ now: () => new Date(instant) });

/** A calendar date in a named zone: `YYYY-MM-DD`. */
export type LocalDate = string;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_MS = 3_600_000;

export function isLocalDate(value: string): value is LocalDate {
  return DATE_PATTERN.test(value);
}

/**
 * A date that exists on the calendar: the shape check alone lets `2026-02-31` through,
 * and Postgres then rejects it as a 500 instead of a validation answer.
 */
export function isRealLocalDate(value: string): value is LocalDate {
  if (!isLocalDate(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

export function assertIanaZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
  } catch {
    throw new RangeError(`Unknown IANA time zone: ${timeZone}`);
  }
  return timeZone;
}

/**
 * BR-014: the study day starts at `rolloverHour` in the user's zone.
 * A rollover hour of 0 is plain midnight, the MVP boundary (OD-G03).
 */
export function localDateOf(instant: Date, timeZone: string, rolloverHour = 0): LocalDate {
  assertIanaZone(timeZone);
  if (!Number.isInteger(rolloverHour) || rolloverHour < 0 || rolloverHour > 23) {
    throw new RangeError(`rolloverHour must be an integer 0..23, got ${String(rolloverHour)}`);
  }
  const shifted = toZonedTime(new Date(instant.getTime() - rolloverHour * HOUR_MS), timeZone);
  return formatDate(shifted);
}

function formatDate(date: Date): LocalDate {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * The UTC instants bounding a local study day. `end` is exclusive.
 * DST days are 23 or 25 hours long; this returns whatever the zone dictates.
 */
export function localDayRange(
  date: LocalDate,
  timeZone: string,
  rolloverHour = 0,
): { start: Date; end: Date } {
  assertIanaZone(timeZone);
  if (!isLocalDate(date)) throw new RangeError(`Not a local date: ${date}`);
  const hour = String(rolloverHour).padStart(2, "0");
  const start = fromZonedTime(`${date}T${hour}:00:00`, timeZone);

  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(
    nextDay.getUTCDate(),
  ).padStart(2, "0")}`;
  const end = fromZonedTime(`${nextDate}T${hour}:00:00`, timeZone);

  return { start, end };
}

/** Minutes between two instants, floored, never negative. BR-012: from timestamps only. */
export function elapsedMinutes(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return ms <= 0 ? 0 : Math.floor(ms / 60_000);
}

/** Stored as `timestamptz`; this is the one accepted text form for persistence. */
export function toUtcIso(instant: Date): string {
  return instant.toISOString();
}