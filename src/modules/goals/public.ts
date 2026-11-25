/**
 * Public interface of the Goals module (MODULE-BOUNDARIES section 2).
 */
export {
  assertTargetMinutes,
  exportGoals,
  getGoalProgress,
  getGoalSet,
  goalMetCrossed,
  isGoalMet,
  percentOf,
  purgeGoals,
  removeSubjectGoal,
  seedDailyGoal,
  setDailyGoal,
  setSubjectGoal,
  targetForDay,
  type DailyGoal,
  type GoalContext,
  type GoalProgress,
  type GoalSet,
  type SubjectGoal,
  type SubjectGoalProgress,
} from "./service";
export {
  goalEventSubscribers,
  publishGoalEvent,
  type GoalEvent,
  type GoalEventSubscriber,
  type GoalMetEvent,
} from "./events";
export { goalMetAfterSessionWrite } from "./subscribe";
