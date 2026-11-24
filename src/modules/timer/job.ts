/**
 * M07 recurring job: the idle-session auto-close of BACKGROUND-JOBS section 2 (FR-047).
 * BR-006 closes a run that has not been heard from for more than the idle window, at its
 * last heartbeat and flagged auto-closed, so the work is already in the service; the worker
 * only schedules it every minute in UTC.
 */
import { config } from "../../kernel/config";
import type { Database } from "../../kernel/db";
import type { ScheduledJob } from "../../kernel/jobs";
import { closeIdleRuns } from "./service";

export const timerIdleCloseJob: ScheduledJob = {
  name: config.jobs.timerIdleCloseQueue,
  cron: config.jobs.timerIdleCloseCron,
  run(database: Database, now: Date): Promise<{ closed: number; discarded: number }> {
    return closeIdleRuns(database, now);
  },
};
