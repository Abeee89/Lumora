"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { StudySession } from "@/modules/sessions/public";
import type { StopTimerResult, TimerSettings, TimerState } from "@/modules/timer/public";
import { apiRequest, type ApiFailure } from "../api-client";
import {
  Button,
  ButtonLink,
  ErrorPanel,
  Hint,
  Label,
  Panel,
  SelectInput,
  TextLink,
  formId,
} from "../control";
import { formatLocalDate, timeInZone } from "../format";
import { messageFor } from "../messages";
import { SubjectDot } from "../subject-dot";
import { failureBody } from "./feedback";
import { ReplaceTimerDialog, TimerDurationsDialog, type DurationFields } from "./timer-dialogs";

export interface TimerTopicOption {
  id: string;
  name: string;
  version: number;
  status: string;
}

export interface TimerSubjectOption {
  id: string;
  name: string;
  colour: string;
  /** EC-007: an archived subject still names past sessions but cannot start a run. */
  archived: boolean;
  topics: readonly TimerTopicOption[];
}

export interface TimerPlanEntryOption {
  id: string;
  label: string;
}

/**
 * FR-046, EC-001: a heartbeat every 60 s while the tab is visible. An interval boundary is
 * the one exception: the phase only moves when the server is asked, so the beat that follows
 * a boundary goes out at once (and retries every few seconds while the server is unreachable)
 * instead of leaving the face at 0:00 for up to a minute.
 */
const HEARTBEAT_MS = 60_000;
const BOUNDARY_RETRY_MS = 5_000;

type Command = "start" | "replace" | "pause" | "resume" | "stop" | "status" | null;

function clockText(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  const pad = (value: number): string => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

/** Seconds on the face: the countdown for a Pomodoro, the focus time for a stopwatch. */
function faceSeconds(timer: TimerState, nowMs: number): number {
  if (timer.mode === "stopwatch") {
    const live =
      timer.state === "paused" ? 0 : Math.max(0, (nowMs - Date.parse(timer.serverTime)) / 1000);
    return timer.segments.focusSeconds + live;
  }
  const anchor = timer.state === "paused" ? Date.parse(timer.serverTime) : nowMs;
  return Math.max(0, (Date.parse(timer.phaseEndsAt ?? timer.serverTime) - anchor) / 1000);
}

/** The interval the face is counting: the snapshot the run was started with (FR-057). */
function phaseTotalSeconds(timer: TimerState): number | null {
  if (timer.mode === "stopwatch") return null;
  if (timer.phase === "focus") return timer.focusMin * 60;
  if (timer.phase === "break") return timer.breakMin * 60;
  return timer.longBreakMin * 60;
}

function stateText(timer: TimerState | null, synced: boolean): string {
  if (!synced) return "Syncing";
  if (timer === null) return "Ready";
  if (timer.state === "paused") return "Paused";
  if (timer.mode === "stopwatch") return "Stopwatch";
  if (timer.phase === "focus") return "Focus";
  if (timer.phase === "break") return "Break";
  return "Long break";
}

/** What the live region says after the server moves the run (NFR-044, never per second). */
function transitionText(previous: TimerState, next: TimerState): string | null {
  if (next.state === "paused" && previous.state === "running") return "Paused.";
  if (next.state === "running" && previous.state === "paused") return "Resumed.";
  if (next.phase === previous.phase) return null;
  if (next.phase === "break") return "Focus interval ended. Break started.";
  if (next.phase === "long_break") return "Focus interval ended. Long break started.";
  return "Break over. Focus started.";
}

/** EC-001, EC-012: the three outcomes the server can report (FR-045). */
function outcomeText(outcome: StopTimerResult, subjectName: string): string {
  if (outcome.outcome === "discarded") return "Not saved: shorter than 1 minute.";
  if (outcome.outcome === "time_only") return "Saved as time only (under 5 minutes of focus).";
  const minutes = minutesOf(outcome.session?.durationSeconds ?? 0);
  const pomodoros = outcome.session?.pomodorosCompleted ?? 0;
  const count = pomodoros === 1 ? "1 Pomodoro" : `${pomodoros} Pomodoros`;
  return pomodoros > 0
    ? `Saved: ${subjectName}, ${minutes} min · ${count}`
    : `Saved: ${subjectName}, ${minutes} min`;
}

function minutesOf(seconds: number): number {
  return Math.round(seconds / 60);
}

/** "1 minute" or "5 minutes", never "1 minutes". */
function minutePhrase(count: number): string {
  return `${count} minute${count === 1 ? "" : "s"}`;
}

/**
 * The bearer token fields arrive as `unknown`; the dialog only needs a name and a mode, so
 * the shape is checked here rather than trusted (ERROR-HANDLING section 4 keeps `details`
 * untyped on the wire).
 */
function asTimerState(value: unknown): TimerState | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const known =
    typeof record["id"] === "string" &&
    typeof record["mode"] === "string" &&
    typeof record["subjectId"] === "string" &&
    typeof record["version"] === "number";
  return known ? (value as TimerState) : null;
}

function asTimerSettings(value: unknown): TimerSettings | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  return typeof record["version"] === "number" && typeof record["focusMin"] === "number"
    ? (value as TimerSettings)
    : null;
}

/** One AudioContext per page, created on the Start press so the browser lets it sound later. */
let audioContext: AudioContext | null = null;

function beep(): void {
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // A blocked AudioContext is not a failure: the alert region still carries the message.
  }
}

function notify(title: string, body: string): void {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification(title, { body });
  } catch {
    // Notifications are an enhancement over the in-app alert region (EC-024).
  }
}

/**
 * A-3 Timer (FR-040..FR-059). The server owns the clock: this screen renders
 * `phaseEndsAt` against the server time it was given and asks the server to move the run,
 * so a reload or a second tab always agrees with what is stored (FR-054, FR-059).
 */
export function TimerScreen({
  subjects,
  planEntries,
  settings: initialSettings,
  sessions: initialSessions,
  timeZone,
}: {
  subjects: readonly TimerSubjectOption[];
  planEntries: readonly TimerPlanEntryOption[];
  settings: TimerSettings;
  sessions: readonly StudySession[];
  timeZone: string;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [sessions, setSessions] = useState<readonly StudySession[]>(initialSessions);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [synced, setSynced] = useState(false);
  const [loadFailure, setLoadFailure] = useState<ApiFailure | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retry, setRetry] = useState<"pause" | "resume" | "stop" | null>(null);
  const [command, setCommand] = useState<Command>(null);
  const [outcome, setOutcome] = useState<StopTimerResult | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusChoice, setStatusChoice] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [conflict, setConflict] = useState<TimerState | null>(null);
  const [durationsOpen, setDurationsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [subjectId, setSubjectId] = useState(
    () => subjects.find((entry) => !entry.archived)?.id ?? "",
  );
  const [topicId, setTopicId] = useState("");
  const [planEntryId, setPlanEntryId] = useState("");
  const [mode, setMode] = useState<"pomodoro" | "stopwatch">("pomodoro");
  const [dismissedAutoClose, setDismissedAutoClose] = useState<string | null>(null);
  const [topicVersions, setTopicVersions] = useState<Record<string, number>>(() => {
    const versions: Record<string, number> = {};
    for (const subject of subjects) {
      for (const topic of subject.topics) versions[topic.id] = topic.version;
    }
    return versions;
  });
  const timerRef = useRef<TimerState | null>(null);
  const lastBeatRef = useRef(0);

  const subjectById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );
  const topicById = useMemo(() => {
    const topics = new Map<string, TimerTopicOption>();
    for (const entry of subjects) {
      for (const topic of entry.topics) topics.set(topic.id, topic);
    }
    return topics;
  }, [subjects]);

  const choosable = subjects.filter((entry) => !entry.archived);
  const subject = choosable.find((entry) => entry.id === subjectId);
  const topics = subject?.topics ?? [];
  const autoClosed = sessions.find((session) => session.autoClosed) ?? null;
  const showAutoClosed = autoClosed !== null && autoClosed.id !== dismissedAutoClose;
  const outcomeSession = outcome?.session ?? null;
  const outcomeTopic =
    outcomeSession === null || outcomeSession.topicId === null
      ? undefined
      : topicById.get(outcomeSession.topicId);

  const refreshSessions = useCallback(async () => {
    const result = await apiRequest<{ data: StudySession[] }>("/api/app/sessions?limit=5", {
      method: "GET",
    });
    if (result.ok) setSessions(result.data.data);
  }, []);

  const applyState = useCallback((next: TimerState | null) => {
    const previous = timerRef.current;
    timerRef.current = next;
    setSynced(true);
    setLoadFailure(null);
    setTimer(next);
    if (previous === null || next === null || previous.id !== next.id) {
      if (previous !== null && next === null) setAnnouncement("Timer stopped.");
      return;
    }
    const text = transitionText(previous, next);
    if (text === null) return;
    setAnnouncement(text);
    if (next.phase === "break" || next.phase === "long_break") {
      const body =
        next.phase === "break"
          ? `Break: ${minutePhrase(next.breakMin)}.`
          : `Long break: ${minutePhrase(next.longBreakMin)}.`;
      setAlert(`Focus interval ended. ${body}`);
      notify("Focus interval ended", body);
    } else if (previous.phase !== "focus") {
      beep();
    }
  }, []);

  const beat = useCallback(async () => {
    const result = await apiRequest<TimerState>("/api/app/timer/heartbeat", { method: "POST" });
    if (result.ok) {
      lastBeatRef.current = Date.now();
      setOffline(false);
      applyState(result.data);
      return;
    }
    if (result.failure.code === "session_already_closed") {
      applyState(null);
      setAlert("Your session was closed automatically after 30 minutes without activity.");
      await refreshSessions();
      return;
    }
    setOffline(result.failure.code === "network_error");
  }, [applyState, refreshSessions]);

  /** TIM-01: the same read on first paint and whenever a stale tab becomes visible again. */
  const loadState = useCallback(async () => {
    const result = await apiRequest<{ timer: TimerState | null; serverTime: string }>(
      "/api/app/timer",
      { method: "GET" },
    );
    if (result.ok) {
      applyState(result.data.timer);
      return;
    }
    setSynced(true);
    setLoadFailure(result.failure);
  }, [applyState]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /** FR-046, BR-006: beat only while the tab is visible, so an abandoned tab can idle out. */
  useEffect(() => {
    if (timer === null || timer.state !== "running" || command !== null) return;
    if (document.visibilityState !== "visible") return;
    const due = timer.phaseEndsAt !== null && Date.parse(timer.phaseEndsAt) <= nowMs;
    if (nowMs - lastBeatRef.current < (due ? BOUNDARY_RETRY_MS : HEARTBEAT_MS)) return;
    lastBeatRef.current = nowMs;
    void beat();
  }, [nowMs, timer, command, beat]);

  /** A tab that was idle when another device started a run catches up on focus (EC-002). */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      lastBeatRef.current = 0;
      if (timerRef.current === null || timerRef.current.state === "paused") void loadState();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadState]);

  /** Deliverable: a tab title countdown, so a hidden tab still reads the clock. */
  useEffect(() => {
    const base = "Timer · Lumora";
    if (timer === null || timer.state === "paused") {
      document.title = base;
      return;
    }
    const label =
      timer.mode === "stopwatch" ? "Stopwatch" : timer.phase === "focus" ? "Focus" : "Break";
    document.title = `${clockText(faceSeconds(timer, nowMs))} · ${label} · Lumora`;
    return () => {
      document.title = base;
    };
  }, [timer, nowMs]);

  const sendStart = async (replaceRunning: boolean) => {
    setCommand(replaceRunning ? "replace" : "start");
    setActionError(null);
    const result = await apiRequest<TimerState>("/api/app/timer/start", {
      method: "POST",
      headers: { "idempotency-key": crypto.randomUUID() },
      body: {
        mode,
        subjectId,
        topicId: topicId === "" ? null : topicId,
        planEntryId: planEntryId === "" ? null : planEntryId,
        replaceRunning,
      },
    });
    setCommand(null);
    if (result.ok) {
      applyState(result.data);
      setOutcome(null);
      setAlert(null);
      setConflict(null);
      setReplaceOpen(false);
      setAnnouncement("Timer started.");
      return;
    }
    if (result.failure.code === "timer_already_running") {
      setConflict(asTimerState(result.failure.details["current"]));
      setReplaceOpen(true);
      return;
    }
    setActionError(`The timer did not start. ${failureBody(result.failure)}`);
    setRetry(null);
  };

  const sendClock = async (verb: "pause" | "resume") => {
    if (timer === null) return;
    setCommand(verb);
    setActionError(null);
    const result = await apiRequest<TimerState>(`/api/app/timer/${verb}`, {
      method: "POST",
      headers: { "if-match": `"${timer.version}"` },
    });
    setCommand(null);
    if (result.ok) {
      setRetry(null);
      applyState(result.data);
      return;
    }
    const current = asTimerState(result.failure.details["current"]);
    if (current !== null) applyState(current);
    setRetry(verb);
    setActionError(`${verb === "pause" ? "Pause" : "Resume"} was not saved. ${failureBody(result.failure)}`);
  };

  const sendStop = async () => {
    if (timer === null) return;
    setCommand("stop");
    setActionError(null);
    const result = await apiRequest<StopTimerResult>("/api/app/timer/stop", {
      method: "POST",
      headers: {
        "if-match": `"${timer.version}"`,
        "idempotency-key": crypto.randomUUID(),
      },
      body: {},
    });
    setCommand(null);
    if (result.ok) {
      setRetry(null);
      applyState(null);
      setStatusChoice(null);
      setStatusError(null);
      setOutcome(result.data);
      setAlert(null);
      setAnnouncement(outcomeText(result.data, subjectById.get(timer.subjectId)?.name ?? "Session"));
      await refreshSessions();
      return;
    }
    const current = asTimerState(result.failure.details["current"]);
    if (current !== null) applyState(current);
    if (result.failure.code === "session_already_closed") applyState(null);
    setRetry("stop");
    setActionError(`Stop was not saved. ${failureBody(result.failure)}`);
  };

  /** A-3 error state: the command that failed can be sent again without touching the clock. */
  const retryAction = () => {
    if (retry === "stop") {
      void sendStop();
      return;
    }
    if (retry !== null) void sendClock(retry);
  };

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
    const current = asTimerSettings(result.failure.details["current"]);
    if (current !== null) setSettings(current);
    return result.failure;
  };

  const saveTopicStatus = async () => {
    if (outcomeTopic === undefined || outcomeSession?.topicId == null) return;
    const topicIdToSave = outcomeSession.topicId;
    const choice = statusChoice ?? outcomeTopic.status;
    setCommand("status");
    setStatusError(null);
    const result = await apiRequest<{ version: number }>(`/api/app/topics/${topicIdToSave}`, {
      method: "PATCH",
      headers: { "if-match": `"${topicVersions[topicIdToSave] ?? 0}"` },
      body: { status: choice },
    });
    setCommand(null);
    if (result.ok) {
      setTopicVersions((versions) => ({ ...versions, [topicIdToSave]: result.data.version }));
      setOutcome(null);
      setAnnouncement("Topic status saved.");
      return;
    }
    setStatusError(messageFor(result.failure.code, failureBody(result.failure)));
  };

  const enableAlerts = () => {
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission();
    beep();
  };

  const paused = timer !== null && timer.state === "paused";
  const face = timer === null ? null : faceSeconds(timer, nowMs);
  const total = timer === null ? null : phaseTotalSeconds(timer);
  /** The run the replace dialog names: the synced one, else the one the 409 reported. */
  const running = timer ?? conflict;
  /** A-3: the setup collapses to a summary; the run owns it once started, so a reload agrees. */
  const setupSummary =
    timer === null
      ? null
      : [
          subjectById.get(timer.subjectId)?.name,
          timer.mode === "pomodoro" ? "Pomodoro" : "Stopwatch",
          timer.topicId === null ? undefined : topicById.get(timer.topicId)?.name,
          planEntries.find((entry) => entry.id === timer.planEntryId)?.label,
        ]
          .filter((part): part is string => part !== undefined)
          .join(" · ");

  const alertsOffered =
    typeof Notification !== "undefined" &&
    typeof window !== "undefined" &&
    Notification.permission === "default";

  return (
    <div className="mx-auto max-w-[1024px] space-y-6">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {durationsOpen && (
        <TimerDurationsDialog
          settings={settings}
          onClose={() => setDurationsOpen(false)}
          onSave={saveDurations}
        />
      )}
      {replaceOpen && (
        <ReplaceTimerDialog
          summary={
            running === null
              ? "A timer"
              : `${subjectById.get(running.subjectId)?.name ?? "A session"}, ${
                  running.mode === "pomodoro" ? "Pomodoro" : "Stopwatch"
                }`
          }
          pending={command === "replace"}
          onClose={() => setReplaceOpen(false)}
          onReplace={() => void sendStart(true)}
        />
      )}

      <div className="grid gap-6 min-[900px]:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        <div className="space-y-6">
          {loadFailure !== null && (
            <ErrorPanel
              title="The timer could not load"
              body={failureBody(loadFailure)}
              requestId={loadFailure.requestId}
              action={<Button onClick={() => window.location.reload()}>Try again</Button>}
            />
          )}
          {alert !== null && (
            <Panel className="space-y-2">
              <p role="status" className="text-sm font-semibold text-ink">
                {alert}
              </p>
              <Button variant="secondary" onClick={() => setAlert(null)}>
                Dismiss
              </Button>
            </Panel>
          )}

          <Panel className="space-y-5">
            <div className="flex flex-col items-center gap-2">
              <TimerFace timer={timer} seconds={face} total={total} synced={synced} />
              <p className="text-base font-semibold text-ink">{stateText(timer, synced)}</p>
              {timer !== null && timer.mode === "pomodoro" && (
                <p className="flex items-center gap-2 text-sm text-ink-2">
                  Focus {Math.min(timer.cycleIndex, timer.cyclesBeforeLongBreak)} of{" "}
                  {timer.cyclesBeforeLongBreak}
                  <span aria-hidden="true" className="inline-flex gap-1">
                    {Array.from({ length: timer.cyclesBeforeLongBreak }, (_, index) => (
                      <span
                        key={index}
                        className={`inline-block size-2 rounded-full ${
                          index < timer.cycleIndex - 1 ? "bg-primary" : "bg-line-strong"
                        }`}
                      />
                    ))}
                  </span>
                </p>
              )}
            </div>

            {timer === null ? (
              choosable.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-ink-2">Add a subject to start a session.</p>
                  <ButtonLink href="/subjects" variant="secondary">
                    Add subject
                  </ButtonLink>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={formId("timer-subject")}>Subject</Label>
                    <SelectInput
                      id={formId("timer-subject")}
                      value={subjectId}
                      onChange={(value) => {
                        setSubjectId(value);
                        setTopicId("");
                      }}
                      options={choosable.map((entry) => ({ value: entry.id, label: entry.name }))}
                    />
                  </div>
                  {topics.length > 0 && (
                    <div>
                      <Label htmlFor={formId("timer-topic")} optional>
                        Topic
                      </Label>
                      <SelectInput
                        id={formId("timer-topic")}
                        value={topicId}
                        onChange={setTopicId}
                        placeholder="No topic"
                        options={topics.map((topic) => ({ value: topic.id, label: topic.name }))}
                      />
                    </div>
                  )}
                  {planEntries.length > 0 && (
                    <div>
                      <Label htmlFor={formId("timer-plan")} optional>
                        Link to a planned session
                      </Label>
                      <SelectInput
                        id={formId("timer-plan")}
                        value={planEntryId}
                        onChange={setPlanEntryId}
                        placeholder="No plan entry"
                        options={planEntries.map((entry) => ({ value: entry.id, label: entry.label }))}
                      />
                    </div>
                  )}
                  <div>
                    <span className="block text-sm font-semibold text-ink" id={formId("timer-mode")}>
                      Mode
                    </span>
                    <div
                      role="group"
                      aria-labelledby={formId("timer-mode")}
                      className="flex gap-2"
                    >
                      {(["pomodoro", "stopwatch"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={mode === option}
                          onClick={() => setMode(option)}
                          className={`min-h-11 flex-1 rounded-lg border px-3 text-[15px] font-semibold ${
                            mode === option
                              ? "border-line-strong bg-primary-soft text-on-primary-soft"
                              : "border-line-strong bg-surface text-ink-2"
                          }`}
                        >
                          {option === "pomodoro" ? "Pomodoro" : "Stopwatch"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ) : (
              <p className="text-sm text-ink-2">{setupSummary}</p>
            )}

            {choosable.length > 0 && (
              <>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {timer === null ? (
                    <Button
                      wide
                      className="min-h-14"
                      onClick={() => void sendStart(false)}
                      pending={command === "start"}
                      disabled={subjectId === ""}
                    >
                      Start
                    </Button>
                  ) : (
                    <>
                      {paused ? (
                        <Button
                          wide
                          className="min-h-14"
                          onClick={() => void sendClock("resume")}
                          pending={command === "resume"}
                        >
                          Resume
                        </Button>
                      ) : (
                        <Button
                          wide
                          className="min-h-14"
                          onClick={() => void sendClock("pause")}
                          pending={command === "pause"}
                        >
                          Pause
                        </Button>
                      )}
                      <Button
                        wide
                        variant="secondary"
                        className="min-h-12"
                        onClick={() => void sendStop()}
                        pending={command === "stop"}
                      >
                        Stop
                      </Button>
                    </>
                  )}
                </div>
                {timer === null && subjectId === "" && (
                  <Hint id={formId("timer-start-hint")}>Choose a subject to start.</Hint>
                )}
              </>
            )}
            {actionError !== null && (
              <div role="alert" className="space-y-2">
                <p className="text-sm font-semibold text-error">{actionError}</p>
                {retry !== null && (
                  <Button
                    variant="secondary"
                    onClick={retryAction}
                    pending={command === retry}
                    disabled={timer === null && retry !== "stop"}
                  >
                    Try again
                  </Button>
                )}
              </div>
            )}
            {offline && (
              <p className="text-sm text-ink-2">
                The server is unreachable. The timer keeps its place and syncs when the
                connection returns.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setDurationsOpen(true)}
                className="text-sm text-primary underline underline-offset-2 hover:text-primary-hover"
              >
                Timer durations
              </button>
              {alertsOffered && (
                <button
                  type="button"
                  onClick={enableAlerts}
                  className="text-sm text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  Enable alerts
                </button>
              )}
            </div>
          </Panel>

          {outcome !== null && (
            <Panel className="space-y-3">
              <h2 className="text-base font-semibold text-ink">
                {outcome.outcome === "discarded" ? "Not saved" : "Session saved"}
              </h2>
              <p className="text-sm text-ink-2">
                {outcomeText(
                  outcome,
                  subjectById.get(outcomeSession?.subjectId ?? "")?.name ?? "Session",
                )}
              </p>
              {outcomeTopic !== undefined && (
                <div>
                  <Label htmlFor={formId("timer-topic-status")} optional>
                    Topic status for {outcomeTopic.name}
                  </Label>
                  <SelectInput
                    id={formId("timer-topic-status")}
                    value={statusChoice ?? outcomeTopic.status}
                    onChange={setStatusChoice}
                    options={[
                      { value: "not_started", label: "Not started" },
                      { value: "in_progress", label: "In progress" },
                      { value: "done", label: "Done" },
                    ]}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void saveTopicStatus()}
                  pending={command === "status"}
                  disabled={outcomeTopic === undefined}
                >
                  Save
                </Button>
                <Button variant="secondary" onClick={() => setOutcome(null)}>
                  Skip
                </Button>
              </div>
              {statusError !== null && (
                <p role="alert" className="text-sm font-semibold text-error">
                  {statusError}
                </p>
              )}
            </Panel>
          )}

          {showAutoClosed && autoClosed !== null && (
            <Panel className="space-y-2">
              <h2 className="text-base font-semibold text-ink">Session closed automatically</h2>
              <p className="text-sm text-ink-2">
                Your session was closed automatically after 30 minutes without activity. It
                counts up to {timeInZone(autoClosed.endedAt, timeZone)}.
              </p>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/sessions" variant="secondary">
                  Edit session
                </ButtonLink>
                <Button
                  variant="secondary"
                  onClick={() => {
                    window.sessionStorage.setItem(`lumora:auto-closed:${autoClosed.id}`, "1");
                    setDismissedAutoClose(autoClosed.id);
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">Recent sessions</h2>
              <TextLink href="/sessions" className="text-sm">
                All sessions
              </TextLink>
            </div>
            {sessions.length === 0 ? (
              <p className="text-sm text-ink-2">
                No sessions yet. Start the timer and the time you study appears here.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {sessions.slice(0, 5).map((session) => {
                  const entry = subjectById.get(session.subjectId);
                  return (
                    <li
                      key={session.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 text-sm"
                    >
                      <span className="flex items-baseline gap-2">
                        <SubjectDot colour={entry?.colour ?? "slate"} />
                        <span className="text-ink">{entry?.name ?? "Subject"}</span>
                        {session.autoClosed && (
                          <span className="text-xs text-muted">Auto-closed</span>
                        )}
                      </span>
                      <span className="tabular text-ink-2">
                        {formatLocalDate(session.localDate, { month: "short", day: "numeric" })} ·{" "}
                        {timeInZone(session.startedAt, timeZone)} ·{" "}
                        {minutesOf(session.durationSeconds)} min
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** The focal point: the remaining interval (Pomodoro, with its Arc) or the focus time. */
function TimerFace({
  timer,
  seconds,
  total,
  synced,
}: {
  timer: TimerState | null;
  seconds: number | null;
  total: number | null;
  synced: boolean;
}) {
  const text = seconds === null ? "0:00" : clockText(seconds);
  const fraction = seconds !== null && total !== null && total > 0 ? Math.min(1, seconds / total) : 0;
  const circumference = 2 * Math.PI * 46;
  const minutesLeft = seconds === null ? 0 : Math.ceil(seconds / 60);

  return (
    <div className="relative h-[240px] w-[240px] shrink-0 max-sm:landscape:h-[min(240px,50vh)] max-sm:landscape:w-[min(240px,50vh)] sm:h-[280px] sm:w-[280px]">
      {total !== null && (
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`${minutesLeft} of ${Math.round(total / 60)} minutes remaining`}
        >
          <circle cx="50" cy="50" r="46" fill="none" strokeWidth="3.5" className="stroke-line" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className={timer?.phase === "focus" ? "stroke-primary" : "stroke-accent-strong"}
            strokeDasharray={`${fraction * circumference} ${circumference}`}
          />
        </svg>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          role="timer"
          aria-live="off"
          className="tabular text-[44px] font-semibold leading-none text-ink sm:text-[52px]"
        >
          {synced ? text : "–:–"}
        </span>
      </div>
    </div>
  );
}