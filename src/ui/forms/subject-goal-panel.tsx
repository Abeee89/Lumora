"use client";

import { useCallback, useEffect, useState } from "react";

import type { GoalProgress, GoalSet, SubjectGoal, SubjectGoalProgress } from "@/modules/goals/public";
import { apiRequest, type ApiFailure } from "../api-client";
import { Button, FieldError, Hint, Label, Panel, TextInput, formId } from "../control";
import { messageFor } from "../messages";
import { errorsFromFailure, failureBody } from "./feedback";
import { dailyGoalError, goalLine } from "./goal-fields";

interface PanelState {
  target: number | null;
  figure: SubjectGoalProgress | null;
}

/**
 * A-8 side column (FR-071): this subject's daily target and today's figure against it, with
 * Set and Remove. An archived subject keeps its target but is suspended, so the panel states
 * that and shows no controls (AC-FR-071-4, BR-029). The target comes from GOAL-01, which
 * still lists an archived subject's goal, and the figure from GOAL-05, which lists only the
 * subjects a target can count against.
 */
export function SubjectGoalPanel({
  subjectId,
  archived,
  range,
}: {
  subjectId: string;
  archived: boolean;
  range: { min: number; max: number };
}) {
  const [state, setState] = useState<PanelState | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState<"set" | "remove" | null>(null);

  const load = useCallback(async () => {
    const [set, progress] = await Promise.all([
      apiRequest<GoalSet>("/api/app/goals", { method: "GET" }),
      apiRequest<GoalProgress>("/api/app/goals/progress", { method: "GET" }),
    ]);
    if (!set.ok) {
      setFailure(set.failure);
      return;
    }
    const listed = set.data.subjects.find((entry) => entry.subjectId === subjectId) ?? null;
    const figure =
      progress.ok
        ? (progress.data.subjects.find((entry) => entry.subjectId === subjectId) ?? null)
        : null;
    setFailure(progress.ok ? null : progress.failure);
    setState({ target: listed?.targetMinutes ?? null, figure });
    setValue(listed === null ? "" : String(listed.targetMinutes));
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    const message = dailyGoalError(value, range.min, range.max);
    setError(message);
    setFailure(null);
    if (message !== null) return;

    setPending("set");
    const result = await apiRequest<SubjectGoal>(`/api/app/goals/subjects/${subjectId}`, {
      method: "PUT",
      body: { targetMinutes: Number(value) },
    });
    setPending(null);
    if (!result.ok) {
      setFailure(result.failure);
      const fields = errorsFromFailure(result.failure, {
        codeField: { goal_out_of_range: "targetMinutes" },
      });
      setError(fields["targetMinutes"] ?? null);
      return;
    }
    await load();
  };

  const remove = async () => {
    setPending("remove");
    setFailure(null);
    setError(null);
    const result = await apiRequest<null>(`/api/app/goals/subjects/${subjectId}`, {
      method: "DELETE",
    });
    setPending(null);
    if (!result.ok) {
      setFailure(result.failure);
      return;
    }
    await load();
  };

  return (
    <Panel className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">Daily goal</h2>
      {state === null ? (
        <p aria-busy="true" className="text-sm text-muted">
          Loading goal
        </p>
      ) : archived ? (
        <p className="text-sm text-ink-2">
          {state.target === null
            ? "This subject has no goal."
            : `Goal ${state.target} min. It is suspended while the subject is archived.`}
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-2">
            {state.target === null
              ? "No goal for this subject."
              : state.figure === null
                ? `Goal ${state.target} min.`
                : `Goal ${state.target} min · today ${goalLine(state.figure)}`}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor={formId("subjectGoal")}>Minutes of study a day</Label>
              <TextInput
                id={formId("subjectGoal")}
                type="number"
                value={value}
                onChange={(next) => {
                  setValue(next);
                  setError(null);
                }}
                invalid={error !== null}
                describedBy={formId("subjectGoal-hint")}
              />
              {error === null ? (
                <Hint id={formId("subjectGoal-hint")}>{`${range.min} to ${range.max}`}</Hint>
              ) : (
                <FieldError id={formId("subjectGoal-hint")}>{error}</FieldError>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" pending={pending === "set"}>
                {state.target === null ? "Set goal" : "Update goal"}
              </Button>
              {state.target !== null && (
                <Button
                  variant="secondary"
                  pending={pending === "remove"}
                  onClick={() => void remove()}
                >
                  Remove
                </Button>
              )}
            </div>
          </form>
        </>
      )}
      {failure !== null && (
        <p role="alert" className="text-sm text-error">
          {messageFor(failure.code, failureBody(failure))}
        </p>
      )}
    </Panel>
  );
}