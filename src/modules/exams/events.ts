/**
 * MODULE-BOUNDARIES section 3: Exams owns the exam-event contract. M04 publishes
 * `ExamArchived` (FR-124) only when the optional hourly job actually changes an exam's
 * state; the exam endpoints never emit it because archived state is derived (BR-025).
 * Phase 2 registers the readiness refresh here (BACKGROUND-JOBS section 2).
 */
import { logger } from "../../kernel/logger";
import { createRegistry } from "../../kernel/registries";

export type ExamEvent =
  | {
      type: "ExamArchived";
      examId: string;
      subjectId: string;
      userId: string;
      occurredAt: string;
    };

export type ExamEventSubscriber = (event: ExamEvent) => Promise<void>;

export const examEventSubscribers = createRegistry<ExamEventSubscriber>("exam event subscriber");

/** A failing subscriber is logged and dropped: the write it reports has committed. */
export async function publishExamEvent(event: ExamEvent): Promise<void> {
  const results = await Promise.allSettled(
    examEventSubscribers.entries().map(([, subscriber]) => subscriber(event)),
  );
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const source = examEventSubscribers.entries()[index]?.[0] ?? "unknown";
      logger.error({ err: result.reason, source, event: event.type }, "exam.event.failed");
    }
  }
}
