/**
 * ADR-005 job contract: a module owns its recurring jobs, the worker schedules them.
 * The kernel holds the shape so a module never imports the worker (MODULE-BOUNDARIES
 * section 4: the kernel may not import a module, so implementations are composed in).
 */
import type { Queryable } from "./db";

export interface ScheduledJob {
  /** pg-boss queue name; BACKGROUND-JOBS section 2 lists one per job. */
  name: string;
  /** Cron expression, evaluated in UTC. */
  cron: string;
  /** Runs the effect. Handlers are safe to run twice (BACKGROUND-JOBS section 3). */
  run(database: Queryable, now: Date): Promise<unknown>;
}
