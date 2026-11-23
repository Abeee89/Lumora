import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { localDateOf } from "@/kernel/time";
import { listPlanEntries } from "@/modules/plans/public";
import { getUserClockContext } from "@/modules/profile/public";
import { listSubjects } from "@/modules/subjects/public";
import { listTopics } from "@/modules/topics/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import { SessionList } from "@/ui/forms/session-list";
import type { SessionPlanEntryOption, SessionSubjectOption } from "@/ui/forms/session-dialog";

export const metadata: Metadata = { title: "Sessions · Lumora" };

/**
 * A-4 Sessions (FR-040..FR-048). The manual dialog needs the subject's topics, so they
 * load with the page, and the link picker needs the caller's open plan entries. Archived
 * subjects appear in the list, labelled "(archived)" (EC-007), so both lists load here.
 */
export default async function SessionsPage() {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const database = container().database;
  const clock = await getUserClockContext(database, session.userId);
  const subjects = await listSubjects(database, session.userId, true);
  const options: SessionSubjectOption[] = await Promise.all(
    subjects.map(async (subject) => ({
      id: subject.id,
      name: subject.name,
      colour: subject.color,
      archived: subject.archivedAt !== null,
      topics: (await listTopics(database, session.userId, subject.id, true)).map((topic) => ({
        id: topic.id,
        name: topic.name,
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
  const planEntryOptions: SessionPlanEntryOption[] = planEntries
    .filter((entry) => entry.status !== "done")
    .map((entry) => ({
      id: entry.id,
      label: `${entry.localDate} · ${timeText(entry.startsAt, clock.timezone)} · ${entry.plannedMin} min`,
    }));

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Sessions
      </h1>
      <p className="text-ink-2">
        Review and correct the sessions you have recorded, or add one you studied without
        the timer.
      </p>
      <SessionList
        subjects={options}
        planEntries={planEntryOptions}
        today={today}
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
