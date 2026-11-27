import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { localDateOf } from "@/kernel/time";
import { getMonthHeatmap } from "@/modules/calendar/public";
import { getUserClockContext } from "@/modules/profile/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import { CalendarClient } from "@/ui/forms/calendar-month";

export const metadata: Metadata = { title: "Calendar · Lumora" };

/**
 * A-5 Calendar (FR-060..FR-062). The page loads the current month server-side so the grid
 * paints immediately; the client moves between months, fetches the day detail and keeps
 * the ARIA grid keyboard contract (single tab stop, arrows, Home/End, PageUp/PageDown).
 */
export default async function CalendarPage() {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const database = container().database;
  const clock = await getUserClockContext(database, session.userId);
  const now = new Date();
  const today = localDateOf(now, clock.timezone, clock.rolloverHour);
  const initialMonth = await getMonthHeatmap(database, session.userId, today.slice(0, 7), {
    now,
    timezone: clock.timezone,
    rolloverHour: clock.rolloverHour,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Calendar
      </h1>
      <nav aria-label="Calendar views" className="flex gap-1 border-b border-line text-sm">
        <span className="border-b-2 border-primary px-3 py-2 font-semibold text-primary">Month</span>
        <a href="/plan" className="inline-flex min-h-11 items-center px-3 text-ink-2 hover:text-primary">
          Plan list
        </a>
      </nav>
      <CalendarClient initialMonth={initialMonth} today={today} timeZone={clock.timezone} />
    </div>
  );
}
