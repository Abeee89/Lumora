/**
 * Public interface of the Timer module (MODULE-BOUNDARIES section 2). Timer depends on
 * Study sessions, which never depends back on it; the composed session event is published
 * through `sessions.publishSessionEvent`.
 */
export {
  advancePhases,
  classifyStop,
  closeIdleRuns,
  defaultSettings,
  exportTimer,
  focusSeconds,
  getTimerSettings,
  getTimerState,
  heartbeatTimer,
  idleDeadline,
  isIdle,
  pauseTimer,
  phaseSeconds,
  purgeTimer,
  registerTimerArchiveGuard,
  resumeTimer,
  runningFocus,
  settleIdleRun,
  startTimer,
  stopTimer,
  updateTimerSettings,
  type AudioLoop,
  type PhaseAdvance,
  type PhaseSnapshot,
  type StartTimerInput,
  type StopClassification,
  type StopOutcome,
  type StopTimerResult,
  type TimerContext,
  type TimerMode,
  type TimerPhase,
  type TimerRunState,
  type TimerSegmentsSummary,
  type TimerSettings,
  type TimerState,
  type UpdateTimerSettingsInput,
} from "./service";
export { timerIdleCloseJob } from "./job";
