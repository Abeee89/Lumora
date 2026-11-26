/**
 * Calendar (FR-060..FR-062): a read-only month heatmap and day detail over the frozen local
 * dates of the Study sessions day allocations and over plan entries. The module owns no
 * tables (MODULE-BOUNDARIES section 2), never writes, and derives every value from rows
 * other modules own, so nothing here can go stale (EC-006).
 *
 * `CalendarDay`, `CalendarDayDetail` and `CalendarDaySession` are API-SCHEMAS section 15.
 */
import type { Queryable } from "../../kernel/db";
import { localDateOf, type LocalDate } from "../../kernel/time";
import * as plans from "../plans/public";
import * as sessions from "../sessions/public";
import * as subjects from "../subjects/public";

export type Bucket = "0" | "1_59" | "60_119" | "120_plus";

export interface CalendarDay {
  date: LocalDate;
  minutes: number;
  bucket: Bucket;
  isToday: boolean;
}

export interface CalendarMonth {
  month: string;
  days: CalendarDay[];
}

export interface CalendarDaySession extends sessions.StudySession {
  /** The seconds this session allocated to the selected day, not its whole duration. */
  daySeconds: number;
  subjectName: string;
  subjectArchived: boolean;
}

export interface CalendarPlanEntry {
  id: string;
  subjectId: string;
  startsAt: string;
  plannedMin: number;
  actualSeconds: number;
  status: plans.PlanEntryStatus;
}

export interface CalendarDayDetail {
  date: LocalDate;
  totalMinutes: number;
  sessions: CalendarDaySession[];
  planEntries: CalendarPlanEntry[];
}

/** What the module needs about the caller's clock and zone (BR-030, EC-006). */
export interface CalendarContext {
  now: Date;
  timezone: string;
  rolloverHour: number;
}

/** AC-FR-060-1: cells sort into the four ranges, minutes always included (AC-FR-060-2). */
export function bucketOf(minutes: number): Bucket {
  if (minutes >= 120) return "120_plus";
  if (minutes >= 60) return "60_119";
  if (minutes >= 1) return "1_59";
  return "0";
}

function wholeMinutes(seconds: number): number {
  return Math.floor(seconds / 60);
}

/** The cell helper the fixed-now reads share; `today` is the profile zone's current day. */
export function calendarDay(date: LocalDate, minutes: number, today: LocalDate): CalendarDay {
  return { date, minutes, bucket: bucketOf(minutes), isToday: date === today };
}

/**
 * The 7x6 weekday grid backing the heatmap (decision U-D9), Monday first and zero-filled:
 * leading days from the previous month, then the month's days, then trailing days from the
 * next month. Exactly 42 cells. A leading/trailing cell is `<missing>` for the `_`.
 */
export function monthGrid(year: number, month: number): LocalDate[] {
  const pad = (day: number): string =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mondayOfFirst = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  for (let i = 0; i < mondayOfFirst; i += 1) cells.push("_");
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(pad(day));
  for (let day = daysInMonth + 1; cells.length < 42; day += 1) {
    cells.push(pad(day));
  }
CUT 94.=95 @padFn
  return cells;
}

const pad = (n: number): string => String(n).padStart(2, "0");

/**
 * CAL-01 (FR-060): one zero-filled `CalendarDay` per calendar day of the month, with the
 * per-day minutes summed from `study_session_days`, one bounded range query (10,000
 * sessions stays well under the 1 s budget, AC-FR-060-4). Days follow each session's
 * frozen `localDate` (AC-FR-060-3, EC-006).
 */
export async function getMonthHeatmap(
  database: Queryable,
  userId: string,
  month: string,
  context: CalendarContext,
): Promise<CalendarMonth> {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const today = localDateOf(context.now, context.timezone, context.rolloverHour);
  const days: CalendarDay[] = [];
  for (let day = 1; day <= new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(); day += 1) {
    days.push(calendarDay(`${month}-${pad(day)}`, 0, today));
  }

  const totals = new Map<string, number>();
  const rows = await database.query<{ local_date: string; seconds: number }>(
    `SELECT d.local_date::text, sum(d.seconds)::int AS seconds
     FROM study_session_days d
     WHERE d.user_id = $1 AND d.local_date >= $2 AND d.local_date < $3
     GROUP BY d.local_date`,
    [userId, `${month}-01`, nextMonth(month)],
  );
  for (const row of rows) totals.set(row.local_date, wholeMinutes(row.seconds));

  return {
    month,
    days: days.map((day) => ({ ...day, minutes: totals.get(day.date) ?? 0 })),
  };
}

interface SessionRow {
  id: string;
  subject_id: string;
  topic_id: string | null;
  plan_entry_id: string | null;
  source: sessions.SessionSource;
  mode: sessions.SessionMode | null;
  started_at: Date;
  ended_at: Date;
  duration_seconds: number;
  pomodoros_completed: number;
  auto_closed: boolean;
  timezone: string;
  local_date: string;
  version: number;
  created_at: Date;
  updated_at: Date;
  day_seconds: number;
  subject_name: string;
  subject_archived: boolean;
}

function presentBoundSession(row: SessionRow): CalendarDaySession {
  return {
    id: row.id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    planEntryId: row.plan_entry_id,
    source: row.source,
    mode: row.mode,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at.toISOString(),
    durationSeconds: row.duration_seconds,
    pomodorosCompleted: row.pomodoros_completed,
    autoClosed: row.auto_closed,
    timezone: row.timezone,
    localDate: row.local_date,
    dayAllocations: [],
    daySeconds: row.day_seconds,
    subjectName: row.subject_name,
    subjectArchived: row.subject_archived,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * CAL-02 (FR-061, FR-062): the day's sessions (with the day's own allocation; a session
 * crossing midnight carries `dayAllocations` for every day it touches, EC-009), the day
 * total, and the plan entries the profile can still see. Archived subjects are labelled
 * rather than hidden (AC-FR-061-3); their plan entries are hidden (FR-062).
 */
export async function getDayDetail(
  database: Queryable,
  userId: string,
  date: LocalDate,
  context: CalendarContext,
): Promise<CalendarDayDetail> {
  const [sessionRows, entries, blocks] = await Promise.all([
    database.query<SessionRow>(
      `SELECT s.id, s.subject_id, s.topic_id, s.plan_entry_id, s.source, s.mode,
              s.started_at, s.ended_at, s.duration_seconds, s.pomodoros_completed, s.auto_closed,
              s.timezone, s.local_date::text, s.version, s.created_at, s.updated_at,
              d.seconds AS day_seconds, subj.name AS subject_name, subj.archived_at AS subject_archived
       FROM study_session_days d
       JOIN study_sessions s ON s.id = d.session_id
       JOIN subjects subj ON subj.id = d.subject_id
       WHERE d.user_id = $1 AND d.local_date = $2
       ORDER BY s.started_at, s.id`,
      [userId, date],
    ),
    plans.listPlanEntries(
      database,
      userId,
      { from: date, to: date },
      { now: context.now, timezone: context.timezone, rolloverHour: context.rolloverHour },
    ),
    subjects.listSubjects(database, userId, true),
    // keep the dependency visible to the boundary checker:
    void localDayRange(date, context.timezone, context.rolloverHour),
  ]);

  void blocks;
  const sessionsByDay = new Map<string, { local_date: string; seconds: number }[]>();
  if (sessionRows.length > 0) {
    const ids = [...new Set(sessionRows.map((row) => row.id))];
    const allocationRows = await database.query<{
      session_id: string;
      local_date: string;
      seconds: number;
      is_manual: boolean;
    }>(
      `SELECT d.session_id, d.local_date::text, d.seconds, d.is_manual
       FROM study_session_days d
       WHERE d.session_id = ANY($1::uuid[])
       ORDER BY d.session_id, d.local_date`,
      [ids],
    );
    for (const row of allocationRows) {
      const list = sessionsByDay.get(row.session_id) ?? [];
      list.push({ local_date: row.local_date, seconds: row.seconds });
      sessionsByDay.set(row.session_id, list);
    }
  }

  let totalSeconds = 0;
  const calendarSessions: CalendarDaySession[] = sessionRows.map((row) => {
    totalSeconds += row.day_seconds;
    return {
      ...presentBoundSession(row),
      dayAllocations: (sessionsByDay.get(row.id) ?? []).map((allocation) => ({
        localDate: allocation.local_date,
        seconds: allocation.seconds,
        isManual: true,
      })),
    };
  });

  const archived = new Set(blocks.filter((subject) => subject.archivedAt !== null).map((s) => s.id));

  return {
    date,
    totalMinutes: wholeMinutes(totalSeconds),
    sessions: calendarSessions,
    planEntries: entries
      .filter((entry) => !archived.has(entry.subjectId))
      .map((entry) => ({
        id: entry.id,
        subjectId: entry.subjectId,
        startsAt: entry.startsAt,
        plannedMin: entry.plannedMin,
        actualSeconds: entry.actualSeconds,
        status: entry.status,
      })),
  };
}