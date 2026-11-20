/**
 * User profile (FR-006, FR-009, FR-134..FR-138): one row per user, versioned for
 * optimistic concurrency (ADR-011), created with the account.
 *
 * `Profile` is the wire shape of API-SCHEMAS section 2; `hasPassword` and `googleLinked`
 * come from the account links so the account-deletion dialog can pick its proof.
 */
import type { Queryable } from "../../kernel/db";
import { AppError } from "../../kernel/errors";
import { assertIanaZone } from "../../kernel/time";

export type Theme = "light" | "dark" | "system";
export type PrimaryGoal = "exam_prep" | "coursework" | "self_learning";

export interface OnboardingState {
  completedAt: string | null;
  dismissedAt: string | null;
  steps: Record<string, string>;
}

export interface ProfileView {
  email: string;
  displayName: string;
  timezone: string;
  rolloverHour: number;
  theme: Theme;
  primaryGoal: PrimaryGoal | null;
  onboarding: OnboardingState;
  hasPassword: boolean;
  googleLinked: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePatch {
  displayName?: string;
  timezone?: string;
  rolloverHour?: number;
  theme?: Theme;
  primaryGoal?: PrimaryGoal | null;
}

export type OnboardingInput =
  | { action: "complete_step"; step: string }
  | { action: "complete" }
  | { action: "dismiss" }
  | { action: "reopen" };

export const onboardingSteps = ["primary_goal", "first_subject", "daily_goal_timezone", "first_session"] as const;

interface ProfileRow {
  user_id: string;
  email: string;
  display_name: string;
  timezone: string;
  rollover_hour: number;
  theme: Theme;
  primary_goal: PrimaryGoal | null;
  onboarding_completed_at: Date | null;
  onboarding_dismissed_at: Date | null;
  onboarding_steps: Record<string, string>;
  version: number;
  created_at: Date;
  updated_at: Date;
  has_password: boolean;
  google_linked: boolean;
}

const SELECT_PROFILE = `
  SELECT p.user_id, u.email, p.display_name, p.timezone, p.rollover_hour, p.theme,
         p.primary_goal, p.onboarding_completed_at, p.onboarding_dismissed_at,
         p.onboarding_steps, p.version, p.created_at, p.updated_at,
         EXISTS (SELECT 1 FROM auth_accounts a WHERE a.user_id = p.user_id AND a.provider = 'credential') AS has_password,
         EXISTS (SELECT 1 FROM auth_accounts a WHERE a.user_id = p.user_id AND a.provider = 'google') AS google_linked
  FROM user_profiles p
  JOIN users u ON u.id = p.user_id`;

function present(row: ProfileRow): ProfileView {
  const steps: Record<string, string> = {};
  for (const [key, value] of Object.entries(row.onboarding_steps ?? {})) {
    if (typeof value === "string") steps[key] = value;
  }
  return {
    email: row.email,
    displayName: row.display_name,
    timezone: row.timezone,
    rolloverHour: row.rollover_hour,
    theme: row.theme,
    primaryGoal: row.primary_goal,
    onboarding: {
      completedAt: row.onboarding_completed_at?.toISOString() ?? null,
      dismissedAt: row.onboarding_dismissed_at?.toISOString() ?? null,
      steps,
    },
    hasPassword: row.has_password,
    googleLinked: row.google_linked,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * The dictionary requires a display name and sign-up collects none, so the email local
 * part is used until the user edits it (recorded as a reconciliation in M02-EVIDENCE).
 */
export function defaultDisplayName(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  const candidate = local.length > 0 ? local : "Learner";
  return candidate.slice(0, 50);
}

export async function ensureProfile(
  database: Queryable,
  input: { userId: string; email: string; timezone: string },
): Promise<void> {
  await database.query(
    `INSERT INTO user_profiles (user_id, display_name, timezone)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO NOTHING`,
    [input.userId, defaultDisplayName(input.email), input.timezone],
  );
}

export async function getProfile(database: Queryable, userId: string): Promise<ProfileView> {
  const rows = await database.query<ProfileRow>(`${SELECT_PROFILE} WHERE p.user_id = $1`, [userId]);
  const row = rows[0];
  if (row === undefined) throw new AppError("not_found");
  return present(row);
}

export async function getUserClockContext(
  database: Queryable,
  userId: string,
): Promise<{ timezone: string; rolloverHour: number }> {
  const rows = await database.query<{ timezone: string; rollover_hour: number }>(
    "SELECT timezone, rollover_hour FROM user_profiles WHERE user_id = $1",
    [userId],
  );
  const row = rows[0];
  if (row === undefined) throw new AppError("not_found");
  return { timezone: row.timezone, rolloverHour: row.rollover_hour };
}

function validateZone(timezone: string): string {
  try {
    return assertIanaZone(timezone);
  } catch {
    throw new AppError("invalid_timezone", { details: { timezone } });
  }
}

function validateDisplayName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 50) {
    throw new AppError("validation_failed", {
      details: { fields: [{ path: "displayName", rule: "length", min: 1, max: 50 }] },
    });
  }
  return trimmed;
}

/** PROF-02. `If-Match` is mandatory; a mismatch returns the current profile (EC-020). */
export async function updateProfile(
  database: Queryable,
  userId: string,
  expectedVersion: number | null,
  patch: ProfilePatch,
  now: Date,
): Promise<ProfileView> {
  if (expectedVersion === null) throw new AppError("version_required");

  const assignments: string[] = [];
  const values: unknown[] = [userId, expectedVersion, now.toISOString()];

  if (patch.displayName !== undefined) {
    values.push(validateDisplayName(patch.displayName));
    assignments.push(`display_name = $${values.length}`);
  }
  if (patch.timezone !== undefined) {
    values.push(validateZone(patch.timezone));
    assignments.push(`timezone = $${values.length}`);
  }
  if (patch.rolloverHour !== undefined) {
    if (!Number.isInteger(patch.rolloverHour) || patch.rolloverHour < 0 || patch.rolloverHour > 23) {
      throw new AppError("validation_failed", {
        details: { fields: [{ path: "rolloverHour", rule: "range", min: 0, max: 23 }] },
      });
    }
    values.push(patch.rolloverHour);
    assignments.push(`rollover_hour = $${values.length}`);
  }
  if (patch.theme !== undefined) {
    values.push(patch.theme);
    assignments.push(`theme = $${values.length}`);
  }
  if (patch.primaryGoal !== undefined) {
    values.push(patch.primaryGoal);
    assignments.push(`primary_goal = $${values.length}`);
  }

  if (assignments.length === 0) {
    throw new AppError("validation_failed", {
      details: { fields: [{ path: "body", rule: "at_least_one_field" }] },
    });
  }

  const rows = await database.query<{ user_id: string }>(
    `UPDATE user_profiles
     SET ${assignments.join(", ")}, version = version + 1, updated_at = $3
     WHERE user_id = $1 AND version = $2
     RETURNING user_id`,
    values,
  );

  if (rows.length === 0) {
    const current = await database.query<{ user_id: string }>(
      "SELECT user_id FROM user_profiles WHERE user_id = $1",
      [userId],
    );
    if (current.length === 0) throw new AppError("not_found");
    throw new AppError("stale_version", { details: { current: await getProfile(database, userId) } });
  }

  return getProfile(database, userId);
}

/**
 * PROF-03. Deliberately takes no `If-Match` (API-CONVENTIONS section 6: every action is
 * an idempotent set); the version still advances.
 */
export async function updateOnboarding(
  database: Queryable,
  userId: string,
  input: OnboardingInput,
  now: Date,
): Promise<OnboardingState> {
  const rows = await database.query<{ onboarding_steps: Record<string, string> }>(
    "SELECT onboarding_steps FROM user_profiles WHERE user_id = $1 FOR UPDATE",
    [userId],
  );
  const row = rows[0];
  if (row === undefined) throw new AppError("not_found");

  const steps: Record<string, string> = {};
  for (const [key, value] of Object.entries(row.onboarding_steps ?? {})) {
    if (typeof value === "string") steps[key] = value;
  }
  const stamp = now.toISOString();

  if (input.action === "complete_step") {
    if (!(onboardingSteps as readonly string[]).includes(input.step)) {
      throw new AppError("validation_failed", {
        details: { fields: [{ path: "step", rule: "enum" }] },
      });
    }
    if (steps[input.step] === undefined) steps[input.step] = stamp;
    await database.query(
      `UPDATE user_profiles
       SET onboarding_steps = $2, version = version + 1, updated_at = $3
       WHERE user_id = $1`,
      [userId, JSON.stringify(steps), stamp],
    );
  } else if (input.action === "complete") {
    await database.query(
      `UPDATE user_profiles
       SET onboarding_completed_at = $2, version = version + 1, updated_at = $2
       WHERE user_id = $1`,
      [userId, stamp],
    );
  } else if (input.action === "dismiss") {
    await database.query(
      `UPDATE user_profiles
       SET onboarding_dismissed_at = $2, version = version + 1, updated_at = $2
       WHERE user_id = $1`,
      [userId, stamp],
    );
  } else {
    await database.query(
      `UPDATE user_profiles
       SET onboarding_completed_at = NULL, onboarding_dismissed_at = NULL,
           version = version + 1, updated_at = $2
       WHERE user_id = $1`,
      [userId, stamp],
    );
  }

  const fresh = await getProfile(database, userId);
  return fresh.onboarding;
}

/** Registered purge handler (MODULE-BOUNDARIES section 3, NFR-031). */
export async function purgeProfile(userId: string, database: Queryable): Promise<number> {
  const rows = await database.query<{ user_id: string }>(
    "DELETE FROM user_profiles WHERE user_id = $1 RETURNING user_id",
    [userId],
  );
  return rows.length;
}

/** Registered export contributor (FR-130, FR-131). */
export async function exportProfile(userId: string, database: Queryable): Promise<unknown> {
  const rows = await database.query<Record<string, unknown>>(
    `SELECT display_name, timezone, rollover_hour, theme, primary_goal,
            onboarding_completed_at, onboarding_dismissed_at, onboarding_steps,
            created_at, updated_at
     FROM user_profiles WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}