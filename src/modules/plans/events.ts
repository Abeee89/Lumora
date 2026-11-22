/**
 * MODULE-BOUNDARIES section 3: Study plans owns the plan-event contract. Study sessions
 * consumes `PlanEntryDeleted` from M06 (EC-022, BR-003): a deleted entry keeps its
 * sessions, whose `plan_entry_id` the composite foreign key sets to NULL.
 *
 * Delivery is in process. Durable delivery belongs to the Phase 2 readiness job
 * (BACKGROUND-JOBS section 2), which is why no queue is involved in M05.
 */
import { logger } from "../../kernel/logger";
import { createRegistry } from "../../kernel/registries";

export type PlanEvent = {
  type: "PlanEntryDeleted";
  planEntryId: string;
  subjectId: string;
  userId: string;
  occurredAt: string;
};

export type PlanEventSubscriber = (event: PlanEvent) => Promise<void>;

export const planEventSubscribers = createRegistry<PlanEventSubscriber>("plan event subscriber");

/**
 * A failing subscriber is logged and dropped: the write it reports has already committed,
 * so raising would report success as failure.
 */
export async function publishPlanEvent(event: PlanEvent): Promise<void> {
  const results = await Promise.allSettled(
    planEventSubscribers.entries().map(([, subscriber]) => subscriber(event)),
  );
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const source = planEventSubscribers.entries()[index]?.[0] ?? "unknown";
      logger.error({ err: result.reason, source, event: event.type }, "plan.event.failed");
    }
  }
}