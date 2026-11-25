import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { config } from "@/kernel/config";
import { localDateOf } from "@/kernel/time";
import * as goals from "@/modules/goals/public";
import { getUserClockContext } from "@/modules/profile/public";
import { getTimerSettings } from "@/modules/timer/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import { StudySettingsForm } from "@/ui/forms/study-form";

export const metadata: Metadata = { title: "Study · Lumora" };

/** A-15 Study section (FR-070, FR-074, FR-057). */
export default async function StudySettingsPage() {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const database = container().database;
  const now = new Date();
  const clock = await getUserClockContext(database, session.userId);
  const context = { now, ...clock };
  const [set, settings] = await Promise.all([
    goals.getGoalSet(database, session.userId, context),
    getTimerSettings(database, session.userId),
  ]);
  const progress = await goals.getGoalProgress(
    database,
    session.userId,
    localDateOf(now, clock.timezone, clock.rolloverHour),
    context,
  );

  return (
    <div className="space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Study
      </h1>
      <p className="text-ink-2">
        Your daily goal and the durations every new timer starts with. Both apply from now on;
        past days keep the values they had.
      </p>
      <StudySettingsForm
        daily={set.daily}
        progress={progress}
        settings={settings}
        min={config.goal.minMinutes}
        max={config.goal.maxMinutes}
      />
    </div>
  );
}