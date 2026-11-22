/**
 * Public interface of the Plans module (MODULE-BOUNDARIES section 2). Study sessions
 * registers a `PlanEntryDeleted` subscriber from M06; nothing consumes it in M05.
 */
export {
  createPlanEntry,
  deletePlanEntry,
  editPlanEntry,
  exportPlans,
  getPlanEntry,
  listPlanEntries,
  markPlanEntryMissed,
  purgePlans,
  type CreatePlanEntryInput,
  type PlanContext,
  type PlanEntry,
  type PlanEntryListQuery,
  type PlanEntryStatus,
  type PlanWarning,
  type PlanWarningCode,
  type UpdatePlanEntryInput,
} from "./service";
export {
  planEventSubscribers,
  publishPlanEvent,
  type PlanEvent,
  type PlanEventSubscriber,
} from "./events";