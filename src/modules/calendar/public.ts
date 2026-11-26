/**
 * Public interface of the Calendar module (MODULE-BOUNDARIES section 2). Read-only: the
 * module owns no tables, so there is nothing to purge or export (MILESTONES M09 card).
 */
export {
  bucketOf,
  calendarDay,
  getDayDetail,
  getMonthHeatmap,
  monthGrid,
  type Bucket,
  type CalendarContext,
  type CalendarDay,
  type CalendarDayDetail,
  type CalendarDaySession,
  type CalendarMonth,
  type CalendarPlanEntry,
} from "./service";