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
    resetTokenMinutes: 60, // FR-005
    sessionCookieName: "__Host-lumora_session", // API-SECURITY 1.1
    devSessionCookieName: "lumora_session", // API-SECURITY 1.1, HTTP local development
    /** PROPOSED: a conservative email bound; the dictionary fixes no maximum. */
    emailMaxLength: 254,
    displayNameMaxLength: 50, // DATA-DICTIONARY user_profiles.display_name
  },
  session: {
    /** BR-008: anything under one minute is discarded. */
    minimumMinutes: 1,
    /** FR-042 manual entry range. */
    manualMinMinutes: 5,
    manualMaxMinutes: 480,
  },
  /**
   * FR-010: a fixed palette of exactly 10 colours. The keys are what `subjects.color`
   * stores and what the API validates against; the labels are the visible names of the
   * swatch picker. The light and dark values of COLOR-TYPOGRAPHY section 6 live in
   * `app/globals.css` as the `--subject-*` tokens, the only place a hex value may sit.
   */
  subjects: {
    nameMaxLength: 100, // DATA-DICTIONARY subjects.name
    palette: [
      { key: "teal", label: "Teal" },
      { key: "red", label: "Red" },
      { key: "blue", label: "Blue" },
      { key: "brown", label: "Brown" },
      { key: "violet", label: "Violet" },
      { key: "green", label: "Green" },
      { key: "plum", label: "Plum" },
      { key: "slate", label: "Slate" },
      { key: "rust", label: "Rust" },
      { key: "cyan", label: "Cyan" },
    ],
  },
  topics: {
    nameMaxLength: 150, // DATA-DICTIONARY topics.name
    /** BR-024 weight range. */
    weightMin: 1,
    weightMax: 5,
    /** FR-017: a pasted list of more than this many non-blank lines is rejected. */
    bulkMaxLines: 200,
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
    /**
     * PROPOSED: how long a reserved key blocks a duplicate request before it is treated
     * as abandoned (API-CONVENTIONS section 7 keeps `Retry-After` at 1 second).
     */
    reservationSeconds: 30,
  },
  outbox: {
    relayIntervalSeconds: 5,
    relayBatchSize: 100,
    retentionDays: 7,
  },
  jobs: {
    /** BACKGROUND-JOBS section 2: one queue per recurring job, scheduled by cron in UTC. */
    authCleanupQueue: "auth_cleanup",
    /** PROPOSED: 03:00 UTC daily; the spec fixes the cadence, not the hour. */
    authCleanupCron: "0 3 * * *",
  },
  rateLimit: {
    windowSeconds: 60, // API-CONVENTIONS section 10
    publicApiPerMinute: 60, // PROPOSED: U-9
    readPerUserPerMinute: 300,
    heavyPerUserPerMinute: 30, // RL-HEAVY: statistics, calendar, exports, bulk topics
    writePerUserPerMinute: 120,
    signInPerIpPerMinute: 10,
    signUpPerIpPerMinute: 5,
    resetPerIpPerMinute: 5,
    resetPerEmailPerMinute: 3,
    deletePerUserPerMinute: 5,
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
    maxBodyBytes: 512 * 1024, // API-CONVENTIONS section 2
  },
} as const;

export type AppConfig = typeof config;