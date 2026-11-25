import type { GoalProgress, SubjectGoalProgress } from "@/modules/goals/public";
import { messageFor } from "../messages";

/**
 * A-15 and A-3 state the same 5..1440 minutes (BR-013, EC-023), so both surfaces refuse an
 * out-of-range value before sending it and still show the server's copy if one gets through.
 */
export function dailyGoalError(value: string, min: number, max: number): string | null {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= min && parsed <= max) return null;
  return messageFor("goal_out_of_range");
}

/** FR-072, FR-073: one sentence for the figure, shared by the settings section and the timer. */
export function goalLine(progress: GoalProgress | SubjectGoalProgress): string {
  const figure = `${progress.minutes} of ${progress.targetMinutes} min · ${progress.percent}%`;
  return progress.goalMet ? `${figure} · Goal met` : figure;
}
