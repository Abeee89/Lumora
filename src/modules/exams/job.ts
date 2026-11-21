/**
 * M04 recurring job: the exam auto-archive of BACKGROUND-JOBS section 2 (FR-124).
 * Archiving is a derived state (BR-025), so the job only publishes `ExamArchived` for
 * exams whose date crossed today; the worker schedules it hourly in UTC.
 */
import type { ScheduledJob } from "../../kernel/jobs";
import { config } from "../../kernel/config";
import type { Database } from "../../kernel/db";
import { publishExamEvent } from "./events";

export const examAutoArchiveJob: ScheduledJob = {
  name: config.jobs.examAutoArchiveQueue,
  cron: config.jobs.examAutoArchiveCron,
  async run(database: Database, now: Date): Promise<{ archived: number }> {
    const rows = await database.query<{ user_id: string; id: string; subject_id: string }>(
      `SELECT e.user_id, e.id, e.subject_id
       FROM exams e
       JOIN user_profiles p ON p.user_id = e.user_id
       WHERE e.exam_date < (now() AT TIME ZONE p.timezone)::date`,
      [],
    );
    for (const row of rows) {
      await publishExamEvent({
        type: "ExamArchived",
        examId: row.id,
        subjectId: row.subject_id,
        userId: row.user_id,
        occurredAt: now.toISOString(),
      });
    }
    return { archived: rows.length };
  },
};
