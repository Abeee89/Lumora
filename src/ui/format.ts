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