/**
 * NFR-062: every numeric default lives here and nowhere else.
 *
 * Values marked PROPOSED are not owner-approved (PRD section 10, OPEN-DECISIONS.md
 * section F). Changing one here changes every reader of it; do not copy a literal
 * into a module.
 */

/** PROPOSED (PRD U-1..U-9 and the NFR thresholds). */
export const config = {
  auth: {
    passwordMinLength: 10, // NFR-011
    lockoutFailureThreshold: 5, // NFR-012
    lockoutMinutes: 15, // NFR-012
    sessionLifetimeDays: 30, // NFR-013
    revocationMaxSeconds: 60, // NFR-013
    auditRetentionDays: 90, // M02 job
    minimumAge: 16, // PROPOSED: U-6
  },
  session: {
    /** BR-008: anything under one minute is discarded. */
    minimumMinutes: 1,
    /** FR-042 manual entry range. */
    manualMinMinutes: 5,
    manualMaxMinutes: 480,
  },
  timer: {
    /** BR-009 defaults. */
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
    /** BR-007: a stopped Pomodoro only counts as completed after this much focus. */
    completedFocusMinMinutes: 5,
    /** BR-006: auto-close after this much silence, at the last heartbeat. */
    idleCloseMinutes: 30,
    heartbeatSeconds: 60,
    /** FR-059 convergence targets. */
    pollSeconds: 3,
    refreshRecoveryMs: 2000,
    actionAckMs: 200, // NFR-004
  },
  goal: {
    /** BR-013. */
    defaultMinutes: 120,
    minMinutes: 5,
    maxMinutes: 1440,
  },
  plan: {
    /** FR-031. */
    minDurationMinutes: 5,
    maxDurationMinutes: 480,
    overlapGridMinutes: 15, // P2-06
  },
  statistics: {
    maxRangeMonths: 24, // FR-080
    performanceBudgetMs: 1000, // NFR-003
  },
  idempotency: {
    /** R8. */
    retentionDays: 7,
  },
  outbox: {
    relayIntervalSeconds: 5,
    relayBatchSize: 100,
    retentionDays: 7,
  },
  rateLimit: {
    windowSeconds: 60,
    publicApiPerMinute: 60, // PROPOSED: U-9
  },
  export: {
    /** PROPOSED: OD-M16. */
    lifetimeHours: 48,
    maxSessionsPerExport: 10_000, // NFR-005
  },
  phase2: {
    dailyReviewLimit: 50, // PROPOSED: U-3
    groupMembershipCap: 20, // PROPOSED: U-3
  },
  http: {
    requestIdHeader: "x-request-id",
  },
} as const;

export type AppConfig = typeof config;