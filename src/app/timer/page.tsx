import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { localDateOf } from "@/kernel/time";
import { listPlanEntries } from "@/modules/plans/public";
import { getUserClockContext } from "@/modules/profile/public";
import { listSessions } from "@/modules/sessions/public";
import { listSubjects } from "@/modules/subjects/public";
import { getTimerSettings } from "@/modules/timer/public";
import { listTopics } from "@/modules/topics/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import {
  TimerScreen,
  type TimerPlanEntryOption,
  type TimerSubjectOption,
} from "@/ui/forms/timer-screen";

export const metadata: Metadata = { title: "Timer · Lumora" };

/**
 * A-3 Timer (FR-040..FR-059). The live run is read by the client from TIM-01 so the face can
 * sync without a reload; this page supplies what does not change per second: the subjects
 * that can be timed (archived ones cannot be chosen, A-3 error state, so the screen filters
 * them), today's plan entries, the durations the next run will snapshot, and the last five
 * sessions. Archived subjects load too, because a past session still names its subject.
 */
export default async function TimerPage() {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const database = container().database;
  const clock = await getUserClockContext(database, session.userId);
  const subjects = await listSubjects(database, session.userId, true);
  const options: TimerSubjectOption[] = await Promise.all(
    subjects.map(async (subject) => ({
      id: subject.id,
      name: subject.name,
      colour: subject.color,
      archived: subject.archivedAt !== null,
      topics: (await listTopics(database, session.userId, subject.id, true)).map((topic) => ({
        id: topic.id,
        name: topic.name,
        version: topic.version,
        status: topic.status,
      })),
    })),
  );

  const today = localDateOf(new Date(), clock.timezone, clock.rolloverHour);
  const planEntries = await listPlanEntries(
    database,
    session.userId,
    { from: today, to: today },
    { now: new Date(), timezone: clock.timezone, rolloverHour: clock.rolloverHour },
  );
  const planEntryOptions: TimerPlanEntryOption[] = planEntries
    .filter((entry) => entry.status !== "done")
    .map((entry) => ({
      id: entry.id,
      label: `${timeText(entry.startsAt, clock.timezone)} · ${entry.plannedMin} min`,
    }));

  const [settings, sessions] = await Promise.all([
    getTimerSettings(database, session.userId),
    listSessions(database, session.userId, { limit: 5 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
          Timer
        </h1>
        <p className="mt-1 text-ink-2">
          Choose what you are studying, then start. Focus time is measured on the server, so a
          refreshed page or another device agrees with it.
        </p>
      </div>
      <TimerScreen
        subjects={options}
        planEntries={planEntryOptions}
        settings={settings}
        sessions={sessions.data}
        timeZone={clock.timezone}
      />
    </div>
  );
}

function timeText(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}