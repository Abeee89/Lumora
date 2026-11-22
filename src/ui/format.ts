/** "1 topic" / "3 topics" (A-7 row copy). */
export function countText(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

/** Shared display formatting for timestamps shown next to records. */
export function formatLastActive(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (seconds < 90) return "Active now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Active ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Active ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `Active ${days} ${days === 1 ? "day" : "days"} ago`;
  return `Last active ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(then)}`;
}

/**
 * A `LocalDate` (`YYYY-MM-DD`) is a value, not an instant: format it in UTC so no zone
 * shifts the day it names (A-6 day groups, A-13 exam date).
 */
export function formatLocalDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** `HH:mm` of an instant on the profile zone's clock (A-6 row time, FR-037). */
export function timeInZone(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}

/**
 * The instant whose wall clock reads `date` + `time` in `timeZone`. Two offset passes: the
 * first reads the offset at the naive instant, the second corrects it across a DST change.
 * The zone library is kernel-only (ADR-006), so browser code does the arithmetic here.
 */
export function instantInZone(date: string, time: string, timeZone: string): string {
  const naive = Date.parse(`${date}T${time}:00Z`);
  const offsetAt = (ms: number): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(ms));
    const part = (type: string): number =>
      Number(parts.find((entry) => entry.type === type)?.value ?? "0");
    const wall = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
    );
    return wall - Math.floor(ms / 1000) * 1000;
  };
  const firstPass = naive - offsetAt(naive);
  return new Date(naive - offsetAt(firstPass)).toISOString();
}