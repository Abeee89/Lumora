"use client";

import { useState } from "react";

import type { DailyGoal, GoalProgress } from "@/modules/goals/public";
import type { TimerSettings } from "@/modules/timer/public";
import { apiRequest, type ApiFailure } from "../api-client";
import {
  Button,
  FieldError,
  FormFields,
  Hint,
  Label,
  Panel,
  TextInput,
  TextLink,
  formId,
} from "../control";
import { messageFor } from "../messages";
import { errorsFromFailure, failureBody } from "./feedback";
import { dailyGoalError, goalLine } from "./goal-fields";
import { TimerDurationsDialog, type DurationFields } from "./timer-dialogs";

/**
 * A-15 Study (FR-070, FR-074, FR-057): the daily goal with today's figure against it, and
 * the timer durations the next run snapshots (the same fields as the Timer dialog).
 *
 * The goal is one row per day in a dated history, so a save only ever moves the target from
 * today forward (AC-FR-074-3); the figure is re-read after a save because lowering the goal
 * can make today met at once (AC-FR-074-2).
 */
export function StudySettingsForm({
  daily: initialDaily,
  progress: initialProgress,
  settings: initialSettings,
  min,
  max,
}: {
  daily: DailyGoal;
  progress: GoalProgress;
  settings: TimerSettings;
  min: number;
  max: number;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [target, setTarget] = useState(String(initialDaily.targetMinutes));
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [durationsOpen, setDurationsOpen] = useState(false);

  const saveGoal = async () => {
    const message = dailyGoalError(target, min, max);
    setError(message);
    setFailure(null);
    setSaved(false);
    if (message !== null) return;

    setPending(true);
    const result = await apiRequest<DailyGoal>("/api/app/goals/daily", {
      method: "PUT",
      body: { targetMinutes: Number(target) },
    });
    if (!result.ok) {
      setPending(false);
      setFailure(result.failure);
      const fields = errorsFromFailure(result.failure, {
        codeField: { goal_out_of_range: "targetMinutes" },
      });
      setError(fields["targetMinutes"] ?? null);
      return;
    }

    setTarget(String(result.data.targetMinutes));
    const refreshed = await apiRequest<GoalProgress>("/api/app/goals/progress", { method: "GET" });
    setPending(false);
    if (refreshed.ok) setProgress(refreshed.data);
    setSaved(true);
  };

  /** TIM-08: the row is created lazily, so the first save sends no `If-Match`. */
  const saveDurations = async (fields: DurationFields): Promise<ApiFailure | null> => {
    const headers = settings.version > 0 ? { "if-match": `"${settings.version}"` } : {};
    const result = await apiRequest<TimerSettings>("/api/app/timer/settings", {
      method: "PATCH",
      headers,
      body: fields,
    });
    if (result.ok) {
      setSettings(result.data);
      setDurationsOpen(false);
      return null;
    }
    return result.failure;
  };

  return (
    <div className="space-y-6">
      <Panel className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Daily goal</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveGoal();
          }}
          className="space-y-4"
        >
          <FormFields>
            <div className="max-w-xs">
              <Label htmlFor={formId("dailyGoalTarget")}>Minutes of study a day</Label>
              <TextInput
                id={formId("dailyGoalTarget")}
                type="number"
                value={target}
                onChange={(next) => {
                  setTarget(next);
                  setError(null);
                  setSaved(false);
                }}
                invalid={error !== null}
                describedBy={formId("dailyGoalTarget-hint")}
              />
              {error === null ? (
                <Hint id={formId("dailyGoalTarget-hint")}>{`${min} to ${max}`}</Hint>
              ) : (
                <FieldError id={formId("dailyGoalTarget-hint")}>{error}</FieldError>
              )}
            </div>
          </FormFields>

          <p className="text-sm text-ink-2">
            Today: <span className="font-semibold text-ink">{goalLine(progress)}</span>
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" pending={pending}>
              Save goal
            </Button>
            <TextLink href="/subjects">Set a goal for one subject</TextLink>
          </div>
          {saved && (
            <p role="status" className="text-sm text-ink-2">
              Goal saved. It applies from today onward; past days keep the goal they had.
            </p>
          )}
          {failure !== null && error === null && (
            <p role="alert" className="text-sm text-error">
              {messageFor(failure.code, failureBody(failure))}
            </p>
          )}
        </form>
      </Panel>

      <Panel className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Timer durations</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-2">Focus</dt>
            <dd className="font-semibold text-ink">{settings.focusMin} min</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-2">Break</dt>
            <dd className="font-semibold text-ink">{settings.breakMin} min</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-2">Long break</dt>
            <dd className="font-semibold text-ink">{settings.longBreakMin} min</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-2">Focus intervals before a long break</dt>
            <dd className="font-semibold text-ink">{settings.cyclesBeforeLongBreak}</dd>
          </div>
        </dl>
        <Button variant="secondary" onClick={() => setDurationsOpen(true)}>
          Edit timer durations
        </Button>
      </Panel>

      {durationsOpen && (
        <TimerDurationsDialog
          settings={settings}
          onClose={() => setDurationsOpen(false)}
          onSave={saveDurations}
        />
      )}
    </div>
  );
}
