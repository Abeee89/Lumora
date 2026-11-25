/**
 * MODULE-BOUNDARIES section 3: Study sessions owns the session-event contract. M06
 * publishes `SessionCompleted`, `SessionEdited` and `SessionDeleted` after their writes
 * commit; M08 adds the Goals subscriber for progress and goal-met (FR-072, FR-073), and
 * the XP and statistics subscribers are later milestones (BR-018, FR-088).
 *
 * Delivery is in process. Durable delivery belongs to the Phase 2 readiness job
 * (BACKGROUND-JOBS section 2), which is why no queue is involved in M06.
 */
import { logger } from "../../kernel/logger";
import { createRegistry } from "../../kernel/registries";

export type SessionEvent =
  | {
      type: "SessionCompleted";
      sessionId: string;
      subjectId: string;
      userId: string;
      occurredAt: string;
    }
  | {
      type: "SessionEdited";
      sessionId: string;
      subjectId: string;
      userId: string;
      occurredAt: string;
    }
  | {
      type: "SessionDeleted";
      sessionId: string;
      subjectId: string;
      userId: string;
      occurredAt: string;
    };

export type SessionEventSubscriber = (event: SessionEvent) => Promise<void>;

export const sessionEventSubscribers = createRegistry<SessionEventSubscriber>("session event subscriber");

/**
 * A failing subscriber is logged and dropped: the write it reports has already committed,
 * so raising would report success as failure.
 */
export async function publishSessionEvent(event: SessionEvent): Promise<void> {
  const results = await Promise.allSettled(
    sessionEventSubscribers.entries().map(([, subscriber]) => subscriber(event)),
  );
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const source = sessionEventSubscribers.entries()[index]?.[0] ?? "unknown";
      logger.error({ err: result.reason, source, event: event.type }, "session.event.failed");
    }
  }
}
