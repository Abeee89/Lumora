/**
 * MODULE-BOUNDARIES section 6: Goals publishes `GoalMet` when a local day's progress
 * crosses the target in force on it. The Phase 2 consumers are Gamification (daily goal XP
 * and the streak, FR-160, FR-171) and Notifications; nothing subscribes in the MVP.
 *
 * Delivery is in process, like the Study sessions events, and a failing subscriber is
 * logged rather than raised (OD-M32 covers durable delivery).
 */
import { logger } from "../../kernel/logger";
import { createRegistry } from "../../kernel/registries";
import type { LocalDate } from "../../kernel/time";

/** APPLICATION-FLOWS section 7 step 5: published once for the day that flips to met. */
export interface GoalMetEvent {
  type: "GoalMet";
  userId: string;
  localDate: LocalDate;
  minutes: number;
  targetMinutes: number;
  occurredAt: string;
}

export type GoalEvent = GoalMetEvent;
export type GoalEventSubscriber = (event: GoalEvent) => Promise<void>;

export const goalEventSubscribers = createRegistry<GoalEventSubscriber>("goal event subscriber");

/**
 * A failing subscriber is logged and dropped: the write it reports has already committed, so
 * raising would report success as failure.
 */
export async function publishGoalEvent(event: GoalEvent): Promise<void> {
  const results = await Promise.allSettled(
    goalEventSubscribers.entries().map(([, subscriber]) => subscriber(event)),
  );
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const source = goalEventSubscribers.entries()[index]?.[0] ?? "unknown";
      logger.error({ err: result.reason, source, event: event.type }, "goal.event.failed");
    }
  }
}
