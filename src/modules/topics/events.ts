/**
 * MODULE-BOUNDARIES section 3: Topics owns the topic-event contract, and Exams registers a
 * subscriber at composition time to drop an archived topic from the readiness denominator
 * (EC-008). Events are published after the write that caused them, so a subscriber never
 * sees a state the database does not hold.
 *
 * Delivery is in process. Durable delivery belongs to the Phase 2 readiness job
 * (BACKGROUND-JOBS section 2), which is why no queue is involved in M03.
 */
import { logger } from "../../kernel/logger";
import { createRegistry } from "../../kernel/registries";

export type TopicStatus = "not_started" | "in_progress" | "done";

export type TopicEvent =
  | {
      type: "TopicArchived";
      topicId: string;
      subjectId: string;
      userId: string;
      occurredAt: string;
    }
  | {
      type: "TopicStatusChanged";
      topicId: string;
      subjectId: string;
      userId: string;
      occurredAt: string;
      previousStatus: TopicStatus;
      status: TopicStatus;
    };

export type TopicEventSubscriber = (event: TopicEvent) => Promise<void>;

export const topicEventSubscribers = createRegistry<TopicEventSubscriber>("topic event subscriber");

/**
 * A failing subscriber is logged and dropped: the write it reports has already committed,
 * so raising would report success as failure.
 */
export async function publishTopicEvent(event: TopicEvent): Promise<void> {
  const results = await Promise.allSettled(
    topicEventSubscribers.entries().map(([, subscriber]) => subscriber(event)),
  );
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const source = topicEventSubscribers.entries()[index]?.[0] ?? "unknown";
      logger.error(
        { err: result.reason, source, event: event.type },
        "topic.event.failed",
      );
    }
  }
}
