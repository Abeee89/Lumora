import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { localDateOf } from "@/kernel/time";
import { getUserClockContext } from "@/modules/profile/public";
import { listSubjects } from "@/modules/subjects/public";
import { listTopics } from "@/modules/topics/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import type { PlanSubjectOption } from "@/ui/forms/plan-dialog";
import { PlanList } from "@/ui/forms/plan-list";

export const metadata: Metadata = { title: "Plan · Lumora" };

/**
 * A-6 Plan list (FR-030..FR-038). The dialog needs the subject's topics, so they load with
 * the page: one query per active subject, still an order of magnitude cheaper than the
 * list read a filter change triggers.
 */
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const database = container().database;
  const clock = await getUserClockContext(database, session.userId);
  const subjects = await listSubjects(database, session.userId, false);
  const options: PlanSubjectOption[] = await Promise.all(
    subjects.map(async (subject) => ({
      id: subject.id,
      name: subject.name,
      colour: subject.color,
      topics: (await listTopics(database, session.userId, subject.id, false)).map((topic) => ({
        id: topic.id,
        name: topic.name,
      })),
    })),
  );
  const params = await searchParams;
  const preset = options.find((subject) => subject.id === params.subjectId)?.id ?? null;

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Plan
      </h1>
      <p className="text-ink-2">
        Plan study blocks for your subjects. An overlap, or a plan after one of the subject's
        exam dates, asks for confirmation before it is saved.
      </p>
      <PlanList
        subjects={options}
        today={localDateOf(new Date(), clock.timezone, clock.rolloverHour)}
        timeZone={clock.timezone}
        presetSubjectId={preset}
      />
    </div>
  );
}