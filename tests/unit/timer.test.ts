import { describe, expect, it } from "vitest";

import {
  advancePhases,
  classifyStop,
  defaultSettings,
  focusSeconds,
  idleDeadline,
  isIdle,
  phaseSeconds,
  type PhaseSnapshot,
} from "@/modules/timer/public";

/**
 * The timer's arithmetic, pinned without a database: the phase walk that keeps a Pomodoro
 * honest across a background tab (FR-050, BR-009), the stop classification of BR-007 and
 * BR-008 (FR-058), and the idle window of BR-006.
 */
const T0 = new Date("2026-11-24T09:00:00.000Z");

function at(seconds: number): Date {
  return new Date(T0.getTime() + seconds * 1000);
}

function snapshot(overrides: Partial<PhaseSnapshot> = {}): PhaseSnapshot {
  return {
    phase: "focus",
    phaseEndsAt: at(25 * 60),
    cycleIndex: 1,
    pomodorosCompleted: 0,
    focusMin: 25,
    breakMin: 5,
    longBreakMin: 15,
    cyclesBeforeLongBreak: 4,
    ...overrides,
  };
}

describe("phaseSeconds", () => {
  it("reads the snapshot, so a settings change never moves a run in flight", () => {
    const settings = { focusMin: 25, breakMin: 5, longBreakMin: 15 };
    expect(phaseSeconds(settings, "focus")).toBe(1500);
    expect(phaseSeconds(settings, "break")).toBe(300);
    expect(phaseSeconds(settings, "long_break")).toBe(900);
    expect(phaseSeconds({ ...settings, focusMin: 50 }, "focus")).toBe(3000);
  });
});

describe("advancePhases", () => {
  it("leaves the phase alone before its end, keeping the stored segment start", () => {
    const advance = advancePhases(snapshot(), { openFocusStartedAt: T0, now: at(60), cap: at(600) });
    expect(advance.phase).toBe("focus");
    expect(advance.phaseEndsAt).toEqual(at(1500));
    expect(advance.pomodorosCompleted).toBe(0);
    expect(advance.closedFocus).toEqual([]);
    expect(advance.openFocusStartedAt).toEqual(T0);
  });

  it("closes the focus interval at its end and opens the short break", () => {
    const advance = advancePhases(snapshot(), {
      openFocusStartedAt: T0,
      now: at(1500),
      cap: at(3600),
    });
    expect(advance.phase).toBe("break");
    expect(advance.phaseEndsAt).toEqual(at(1800));
    expect(advance.pomodorosCompleted).toBe(1);
    expect(advance.cycleIndex).toBe(1);
    expect(advance.closedFocus).toEqual([{ start: T0, end: at(1500) }]);
    expect(advance.openFocusStartedAt).toBeNull();
  });

  it("counts every interval a backgrounded tab missed, and opens the one running now", () => {
    // 25 focus + 5 break, twice over: 60 minutes of wall clock with no requests in between.
    const advance = advancePhases(snapshot(), {
      openFocusStartedAt: T0,
      now: at(3600),
      cap: at(7200),
    });
    expect(advance.closedFocus).toEqual([
      { start: T0, end: at(1500) },
      { start: at(1800), end: at(3300) },
    ]);
    expect(advance.phase).toBe("focus");
    // The break that ended exactly at `now` has ended, so this is the third interval.
    expect(advance.cycleIndex).toBe(3);
    expect(advance.openFocusStartedAt).toEqual(at(3600));
  });

  it("takes the long break after the fourth completed focus and restarts the cycle", () => {
    const advance = advancePhases(
      snapshot({ cycleIndex: 4, pomodorosCompleted: 3 }),
      { openFocusStartedAt: T0, now: at(1500), cap: at(3600) },
    );
    expect(advance.phase).toBe("long_break");
    expect(advance.phaseEndsAt).toEqual(at(1500 + 900));
    expect(advance.pomodorosCompleted).toBe(4);
    expect(advance.cycleIndex).toBe(4);

    const afterLongBreak = advancePhases(
      { ...snapshot({ cycleIndex: 4, pomodorosCompleted: 4 }), phase: "long_break", phaseEndsAt: at(900) },
      { openFocusStartedAt: null, now: at(900), cap: at(3600) },
    );
    expect(afterLongBreak.phase).toBe("focus");
    expect(afterLongBreak.cycleIndex).toBe(1);
    expect(afterLongBreak.openFocusStartedAt).toEqual(at(900));
  });

  it("stops at the cap, which is where BR-006 takes over", () => {
    const advance = advancePhases(snapshot(), {
      openFocusStartedAt: T0,
      now: at(60 * 60 * 24),
      cap: at(1700),
    });
    expect(advance.phase).toBe("break");
    expect(advance.pomodorosCompleted).toBe(1);
    expect(advance.closedFocus).toEqual([{ start: T0, end: at(1500) }]);
  });

  it("keeps the caller's segment start for the first interval, because a resume shifts the clock", () => {
    // The stored segment opened at T0 but the phase end moved back by a five minute pause,
    // so deriving the start from `phaseEndsAt - focusMin` would be five minutes early.
    const advance = advancePhases(snapshot({ phaseEndsAt: at(1800) }), {
      openFocusStartedAt: at(300),
      now: at(1800),
      cap: at(3600),
    });
    expect(advance.closedFocus).toEqual([{ start: at(300), end: at(1800) }]);
  });
});

describe("focusSeconds", () => {
  it("sums whole seconds across segments and floors a partial one", () => {
    expect(focusSeconds([])).toBe(0);
    expect(focusSeconds([{ start: T0, end: at(600) }])).toBe(600);
    expect(focusSeconds([{ start: T0, end: at(600) }, { start: at(900), end: at(1200) }])).toBe(900);
    expect(focusSeconds([{ start: T0, end: new Date(T0.getTime() + 1500) }])).toBe(1);
  });
});

describe("classifyStop", () => {
  it("discards under a minute of focus (BR-008, AC-FR-045-2)", () => {
    expect(
      classifyStop({ mode: "stopwatch", focusSeconds: 59, pomodorosCompleted: 0, openFocusSeconds: 59 }),
    ).toEqual({ outcome: "discarded", pomodorosCompleted: 0 });
    expect(
      classifyStop({ mode: "pomodoro", focusSeconds: 59, pomodorosCompleted: 0, openFocusSeconds: 59 }),
    ).toEqual({ outcome: "discarded", pomodorosCompleted: 0 });
  });

  it("stores a stopwatch from exactly 60 s and never counts pomodoros for it", () => {
    expect(
      classifyStop({ mode: "stopwatch", focusSeconds: 60, pomodorosCompleted: 0, openFocusSeconds: 60 }),
    ).toEqual({ outcome: "saved", pomodorosCompleted: 0 });
    expect(
      classifyStop({
        mode: "stopwatch",
        focusSeconds: 90 * 60,
        pomodorosCompleted: 0,
        openFocusSeconds: 90 * 60,
      }),
    ).toEqual({ outcome: "saved", pomodorosCompleted: 0 });
  });

  it("saves a Pomodoro whose open interval reached the five minute minimum (BR-007)", () => {
    expect(
      classifyStop({
        mode: "pomodoro",
        focusSeconds: 299,
        pomodorosCompleted: 0,
        openFocusSeconds: 299,
      }),
    ).toEqual({ outcome: "time_only", pomodorosCompleted: 0 });
    expect(
      classifyStop({
        mode: "pomodoro",
        focusSeconds: 300,
        pomodorosCompleted: 0,
        openFocusSeconds: 300,
      }),
    ).toEqual({ outcome: "saved", pomodorosCompleted: 1 });
  });

  it("counts a focus interval that ran to its end plus minutes of a new one", () => {
    expect(
      classifyStop({
        mode: "pomodoro",
        focusSeconds: 1500 + 120,
        pomodorosCompleted: 1,
        openFocusSeconds: 120,
      }),
    ).toEqual({ outcome: "saved", pomodorosCompleted: 1 });
    expect(
      classifyStop({
        mode: "pomodoro",
        focusSeconds: 1500 + 600,
        pomodorosCompleted: 1,
        openFocusSeconds: 600,
      }),
    ).toEqual({ outcome: "saved", pomodorosCompleted: 2 });
  });

  it("saves time only when a long focus run collected no completed interval", () => {
    expect(
      classifyStop({
        mode: "pomodoro",
        focusSeconds: 20 * 60,
        pomodorosCompleted: 0,
        openFocusSeconds: 0,
      }),
    ).toEqual({ outcome: "time_only", pomodorosCompleted: 0 });
  });
});

describe("the idle window", () => {
  it("ends thirty minutes after the last heartbeat (BR-006)", () => {
    expect(idleDeadline(T0)).toEqual(at(1800));
    expect(isIdle({ last_heartbeat_at: T0 }, at(1799))).toBe(false);
    expect(isIdle({ last_heartbeat_at: T0 }, at(1800))).toBe(false);
    expect(isIdle({ last_heartbeat_at: T0 }, at(1801))).toBe(true);
  });
});

describe("defaultSettings", () => {
  it("answers the configured defaults at version 0, so a first start needs no write", () => {
    expect(defaultSettings()).toEqual({
      focusMin: 25,
      breakMin: 5,
      longBreakMin: 15,
      cyclesBeforeLongBreak: 4,
      audioLoop: "none",
      audioVolume: 50,
      version: 0,
      updatedAt: null,
    });
  });
});
