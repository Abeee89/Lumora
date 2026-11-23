import { describe, expect, it } from "vitest";

import type { Queryable } from "@/kernel/db";
import { AppError } from "@/kernel/errors";
import {
  createPlanEntry,
  deletePlanEntry,
  editPlanEntry,
  listPlanEntries,
  markPlanEntryMissed,
  planEventSubscribers,
  type PlanContext,
  type PlanWarning,
} from "@/modules/plans/public";

/**
 * The plan rules that are pure enough to pin without a database: the inclusive 93-day
 * range (API-CONVENTIONS section 5), the zone window PLAN-01 reads, the order of the
 * checks PLAN-02, PLAN-04 and PLAN-06 document, and what the create writes.
 */
const USER = "018c0000-0000-7000-8000-0000000000aa";
const SUBJECT = "018c0000-0000-7000-8000-0000000000bb";
const TOPIC = "018c0000-0000-7000-8000-0000000000cc";
const ENTRY = "018c0000-0000-7000-8000-0000000000dd";

const NOW = "2026-11-22T10:00:00.000Z";

const utc: PlanContext = { now: new Date(NOW), timezone: "UTC", rolloverHour: 0 };

const newYork: PlanContext = { now: new Date(NOW), timezone: "America/New_York", rolloverHour: 0 };

interface Call {
  text: string;
  values: readonly unknown[];
}

interface Answers {
  subjects?: unknown[];
  topics?: unknown[];
  exams?: unknown[];
  /** Rows the range read returns. */
  plan?: unknown[];
  /** Rows the overlap probe returns; the probe's own bounds are never simulated. */
  overlaps?: unknown[];
  /** Rows the read-back after a write returns. */
  read?: unknown[];
  deleted?: unknown[];
}

/**
 * Answers by the table a statement touches. Any other statement is a test bug, so the
 * fake fails loudly instead of returning an empty set that hides a missing call.
 */
function fakeDatabase(answers: Answers): {
  database: Queryable;
  calls: Call[];
  inserted: () => readonly unknown[] | null;
} {
  const calls: Call[] = [];
  let inserted: readonly unknown[] | null = null;
  const table = (
    text: string,
    values: readonly unknown[],
    key: keyof Omit<Answers, "deleted">,
  ): unknown[] => {
    calls.push({ text, values });
    return answers[key] ?? [];
  };
  const database: Queryable = {
    async query(text: string, values: readonly unknown[] = []): Promise<never[]> {
      if (text.includes("INSERT INTO plan_entries")) {
        calls.push({ text, values });
        inserted = values;
        return [];
      }
      if (text.startsWith("DELETE FROM plan_entries")) {
        calls.push({ text, values });
        return (answers.deleted ?? []) as never[];
      }
      if (text.includes("p.duration_min * interval")) {
        return table(text, values, "overlaps") as never[];
      }
      if (text.includes("WHERE p.id = $1")) return table(text, values, "read") as never[];
      if (text.includes("FROM plan_entries")) return table(text, values, "plan") as never[];
      if (text.includes("FROM exams")) return table(text, values, "exams") as never[];
      if (text.includes("FROM subjects")) return table(text, values, "subjects") as never[];
      if (text.includes("FROM topics")) return table(text, values, "topics") as never[];
      throw new Error(`unexpected statement: ${text}`);
    },
  };
  return { database, calls, inserted: () => inserted };
}

const subjectRow = (archivedAt: Date | null = null) => ({
  id: SUBJECT,
  name: "Algebra",
  color: "teal",
  position: 0,
  archived_at: archivedAt,
  version: 1,
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-01-01T00:00:00.000Z"),
  topic_count: 0,
  done_topic_count: 0,
});

const topicRow = (subjectId: string, archivedAt: Date | null = null) => ({
  id: TOPIC,
  subject_id: subjectId,
  name: "Quadratics",
  weight: 1,
  status: "todo",
  position: 0,
  archived_at: archivedAt,
  version: 1,
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-01-01T00:00:00.000Z"),
});

const planRow = (overrides: Record<string, unknown> = {}) => ({
  id: ENTRY,
  user_id: USER,
  subject_id: SUBJECT,
  topic_id: null,
  starts_at: new Date("2026-11-23T09:00:00.000Z"),
  duration_min: 30,
  timezone: "UTC",
  local_date: "2026-11-23",
  missed_at: null,
  version: 1,
  created_at: new Date("2026-11-20T00:00:00.000Z"),
  actual_seconds: 0,
  variance_seconds: 0,
  ...overrides,
  updated_at: new Date("2026-11-20T00:00:00.000Z"),
});

/** The AppError a call threw, or a test failure when it did not throw. */
async function failure(work: () => Promise<unknown>): Promise<AppError> {
  try {
    await work();
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("expected the call to fail");
}

const list = (database: Queryable, query: Parameters<typeof listPlanEntries>[2]) =>
  listPlanEntries(database, USER, query, utc);

const create = (database: Queryable, input: Parameters<typeof createPlanEntry>[2]) =>
  createPlanEntry(database, USER, input, newYork);

describe("plan range (API-CONVENTIONS section 5, PLAN-01)", () => {
  it("counts the inclusive span and refuses more than 93 days", async () => {
    const { database } = fakeDatabase({ subjects: [] });
    // 2026-11-22 .. 2027-02-22 is 93 inclusive days; one more day is out of range.
    await expect(list(database, { from: "2026-11-22", to: "2027-02-22" })).resolves.toEqual([]);
    const error = await failure(() => list(database, { from: "2026-11-22", to: "2027-02-23" }));
    expect(error.code).toBe("invalid_date_range");
    expect(error.details).toEqual({ maxSpan: "93 days" });
  });

  it("refuses a reversed range", async () => {
    const { database } = fakeDatabase({ subjects: [] });
    const error = await failure(() => list(database, { from: "2026-11-23", to: "2026-11-22" }));
    expect(error.code).toBe("invalid_date_range");
  });

  it("refuses a date that is not real or not a calendar date", async () => {
    const { database } = fakeDatabase({ subjects: [] });
    for (const from of ["2026-02-31", "2026-2-1", "not-a-date"]) {
      const error = await failure(() => list(database, { from, to: "2026-12-01" }));
      expect(error.code, from).toBe("validation_failed");
      expect(error.details, from).toEqual({ fields: [{ path: "from", rule: "date" }] });
    }
  });

  it("reads nothing when every subject is archived (EC-007)", async () => {
    const { database, calls } = fakeDatabase({ subjects: [] });
    await expect(list(database, { from: "2026-11-22", to: "2026-11-30" })).resolves.toEqual([]);
    expect(calls.filter((call) => call.text.includes("FROM plan_entries"))).toEqual([]);
  });
});

describe("plan window (PLAN-01 bounds, EC-006)", () => {
  it("uses the profile zone's local day, not the frozen local date", async () => {
    const { database, calls } = fakeDatabase({ subjects: [subjectRow()] });
    await listPlanEntries(
      database,
      USER,
      { from: "2026-11-22", to: "2026-11-22" },
      newYork,
    );
    const read = calls.find((call) => call.text.includes("FROM plan_entries"));
    expect(read?.values[1]).toEqual(new Date("2026-11-22T05:00:00.000Z"));
    expect(read?.values[2]).toEqual(new Date("2026-11-23T05:00:00.000Z"));
    expect(read?.values[3]).toEqual([SUBJECT]);
    expect(read?.values[4]).toBeNull();
  });

  it("moves the day start by the rollover hour", async () => {
    const { database, calls } = fakeDatabase({ subjects: [subjectRow()] });
    await listPlanEntries(
      database,
      USER,
      { from: "2026-11-22", to: "2026-11-22", subjectId: SUBJECT },
      { now: new Date(NOW), timezone: "UTC", rolloverHour: 4 },
    );
    const read = calls.find((call) => call.text.includes("FROM plan_entries"));
    expect(read?.values[1]).toEqual(new Date("2026-11-22T04:00:00.000Z"));
    expect(read?.values[2]).toEqual(new Date("2026-11-23T04:00:00.000Z"));
    expect(read?.values[4]).toBe(SUBJECT);
  });
});

describe("plan status filter (FR-037)", () => {
  it("derives the status from the missed mark and the actual sum and filters it", async () => {
    const rows = [
      planRow(),
      planRow({ id: "018c0000-0000-7000-8000-0000000000ee", missed_at: new Date(NOW) }),
      planRow({ id: "018c0000-0000-7000-8000-0000000000ff", actual_seconds: 1800 }),
    ];
    const { database } = fakeDatabase({ subjects: [subjectRow()], plan: rows });
    const all = await list(database, { from: "2026-11-22", to: "2026-11-30" });
    expect(all.map((entry) => entry.status)).toEqual(["upcoming", "missed", "done"]);

    const missed = await list(database, { from: "2026-11-22", to: "2026-11-30", status: "missed" });
    expect(missed.map((entry) => entry.id)).toEqual(["018c0000-0000-7000-8000-0000000000ee"]);

    const done = await list(database, { from: "2026-11-22", to: "2026-11-30", status: "done" });
    expect(done.map((entry) => entry.id)).toEqual(["018c0000-0000-7000-8000-0000000000ff"]);
  });
});

describe("PLAN-02 create", () => {
  const base = { subjectId: SUBJECT, startsAt: "2026-11-23T09:00:00.000Z", durationMin: 30 };

  it("refuses an archived subject before it reads the body", async () => {
    const { database, calls } = fakeDatabase({
      subjects: [subjectRow(new Date("2026-11-01T00:00:00.000Z"))],
    });
    const error = await failure(() => create(database, { ...base, durationMin: 1 }));
    expect(error.code).toBe("subject_archived");
    expect(error.details).toEqual({ subjectId: SUBJECT });
    expect(calls.some((call) => call.text.includes("FROM plan_entries"))).toBe(false);
  });

  it("refuses a start that is not in the future", async () => {
    const { database } = fakeDatabase({ subjects: [subjectRow()] });
    for (const startsAt of [NOW, "2026-11-22T09:59:59.999Z", "yesterday"]) {
      const error = await failure(() => create(database, { ...base, startsAt }));
      expect(error.code, startsAt).toBe("validation_failed");
      expect(error.details, startsAt).toEqual({
        fields: [{ path: "startsAt", rule: startsAt === "yesterday" ? "instant" : "future" }],
      });
    }
  });

  it("keeps the duration inside the configured bounds", async () => {
    const { database } = fakeDatabase({ subjects: [subjectRow()] });
    for (const durationMin of [4, 481, 30.5, Number.NaN]) {
      const error = await failure(() => create(database, { ...base, durationMin }));
      expect(error.code, String(durationMin)).toBe("duration_out_of_range");
      expect(error.details, String(durationMin)).toEqual({ min: 5, max: 480 });
    }
  });

  it("names the topic rules without confirming a foreign id", async () => {
    const foreign = fakeDatabase({ subjects: [subjectRow()], topics: [topicRow("other")] });
    const foreignError = await failure(() =>
      create(foreign.database, { ...base, topicId: TOPIC }),
    );
    expect(foreignError.details).toEqual({
      fields: [{ path: "topicId", rule: "member_of_subject" }],
    });

    const unknown = fakeDatabase({ subjects: [subjectRow()], topics: [] });
    const unknownError = await failure(() =>
      create(unknown.database, { ...base, topicId: TOPIC }),
    );
    expect(unknownError.details).toEqual({
      fields: [{ path: "topicId", rule: "member_of_subject" }],
    });

    const archived = fakeDatabase({
      subjects: [subjectRow()],
      topics: [topicRow(SUBJECT, new Date("2026-11-01T00:00:00.000Z"))],
    });
    const archivedError = await failure(() =>
      create(archived.database, { ...base, topicId: TOPIC }),
    );
    expect(archivedError.details).toEqual({
      fields: [{ path: "topicId", rule: "topic_archived" }],
    });
  });

  it("writes the zone and the frozen local date, and echoes confirmed advisories", async () => {
    const overlapping = planRow({
      id: "018c0000-0000-7000-8000-0000000000ff",
      starts_at: new Date("2026-11-23T09:30:00.000Z"),
      duration_min: 60,
    });
    const { database, inserted } = fakeDatabase({
      subjects: [subjectRow()],
      overlaps: [overlapping],
      read: [overlapping],
    });

    const refused = await failure(() => create(database, base));
    expect(refused.code).toBe("overlap_confirmation_required");
    expect(refused.details).toEqual({
      warnings: [
        {
          code: "overlap",
          planEntryId: "018c0000-0000-7000-8000-0000000000ff",
          subjectId: SUBJECT,
          startsAt: "2026-11-23T09:30:00.000Z",
          durationMin: 60,
        },
      ],
    });
    expect(inserted()).toBeNull();

    const saved = await create(database, { ...base, confirmedWarnings: ["overlap"] });
    // 09:00Z is 04:00 in New York, so the entry is frozen on the same local date.
    expect(inserted()).toEqual([
      expect.any(String),
      USER,
      SUBJECT,
      null,
      new Date("2026-11-23T09:00:00.000Z"),
      30,
      "America/New_York",
      "2026-11-23",
    ]);
    expect(saved.warnings).toEqual([
      {
        code: "overlap",
        planEntryId: "018c0000-0000-7000-8000-0000000000ff",
        subjectId: SUBJECT,
        startsAt: "2026-11-23T09:30:00.000Z",
        durationMin: 60,
      },
    ]);
  });

  it("freezes the local date of the zone the caller is in", async () => {
    const { database, inserted } = fakeDatabase({ subjects: [subjectRow()], read: [planRow()] });
    // 02:00Z on the 23rd is 21:00 on the 22nd in New York.
    await create(database, { ...base, startsAt: "2026-11-23T02:00:00.000Z" });
    expect(inserted()?.[7]).toBe("2026-11-22");
  });

  it("refuses an exam-date advisory the caller did not confirm (FR-038)", async () => {
    const { database } = fakeDatabase({
      subjects: [subjectRow()],
      exams: [{ id: "018c0000-0000-7000-8000-000000000011", subject_id: SUBJECT, exam_date: "2026-11-22" }],
    });
    const error = await failure(() => create(database, base));
    expect(error.code).toBe("exam_date_warning_confirmation_required");
    expect(error.details).toEqual({
      warnings: [{ code: "exam_date", examId: "018c0000-0000-7000-8000-000000000011", examDate: "2026-11-22" }],
    });
  });

  it("warns about an overlap before an exam date when both are unconfirmed (FR-034)", async () => {
    const { database } = fakeDatabase({
      subjects: [subjectRow()],
      overlaps: [planRow({ starts_at: new Date("2026-11-23T09:30:00.000Z") })],
      exams: [{ id: "018c0000-0000-7000-8000-000000000011", subject_id: SUBJECT, exam_date: "2026-11-22" }],
    });
    const error = await failure(() => create(database, base));
    expect(error.code).toBe("overlap_confirmation_required");
    expect((error.details?.["warnings"] as PlanWarning[]).map((warning) => warning.code)).toEqual([
      "overlap",
      "exam_date",
    ]);
  });
});

describe("PLAN-04 and PLAN-06 order of checks (BR-028, FR-033)", () => {
  const edit = (database: Queryable, expectedVersion: number | null) =>
    editPlanEntry(database, USER, ENTRY, expectedVersion, { durationMin: 45 }, utc);

  it("asks for a version, then for a field, before it reads the entry", async () => {
    const { database, calls } = fakeDatabase({});

    const noVersion = await failure(() => edit(database, null));
    expect(noVersion.code).toBe("version_required");

    const noField = await failure(() =>
      editPlanEntry(database, USER, ENTRY, 1, {}, utc),
    );
    expect(noField.details).toEqual({ fields: [{ path: "body", rule: "at_least_one_field" }] });
    expect(calls).toEqual([]);
  });

  it("answers a missing entry before a stale one, and a stale one before the read-only rule", async () => {
    const missing = fakeDatabase({ read: [] });
    expect((await failure(() => edit(missing.database, 1))).code).toBe("not_found");

    const stale = fakeDatabase({ read: [planRow({ version: 3 })] });
    const staleError = await failure(() => edit(stale.database, 1));
    expect(staleError.code).toBe("stale_version");
    expect(staleError.details).toEqual({ current: expect.objectContaining({ version: 3 }) });

    const past = fakeDatabase({
      read: [planRow({ starts_at: new Date("2026-11-22T09:00:00.000Z") })],
    });
    const pastError = await failure(() => edit(past.database, 1));
    expect(pastError.code).toBe("past_entry_read_only");
    expect(pastError.details).toEqual({ startsAt: "2026-11-22T09:00:00.000Z" });
  });

  it("marks only an entry that has started, and marks it once", async () => {
    const upcoming = fakeDatabase({ read: [planRow()] });
    const notYet = await failure(() => markPlanEntryMissed(upcoming.database, USER, ENTRY, 1, utc));
    expect(notYet.details).toEqual({ fields: [{ path: "body", rule: "not_started_yet" }] });

    const started = fakeDatabase({
      read: [planRow({ starts_at: new Date("2026-11-22T09:00:00.000Z") })],
    });
    const noVersion = await failure(() => markPlanEntryMissed(started.database, USER, ENTRY, null, utc));
    expect(noVersion.code).toBe("version_required");

    const stale = await failure(() => markPlanEntryMissed(started.database, USER, ENTRY, 2, utc));
    expect(stale.code).toBe("stale_version");

    const already = fakeDatabase({
      read: [planRow({ starts_at: new Date("2026-11-22T09:00:00.000Z"), missed_at: new Date(NOW) })],
    });
    const unchanged = await markPlanEntryMissed(already.database, USER, ENTRY, 1, utc);
    expect(unchanged).toMatchObject({ status: "missed", version: 1 });
    expect(already.calls.some((call) => call.text.includes("UPDATE plan_entries"))).toBe(false);
  });

  it("publishes the delete once the row is gone (FR-032)", async () => {
    const events: string[] = [];
    planEventSubscribers.register("unit-plans", async (event) => {
      events.push(`${event.type}:${event.planEntryId}`);
    });

    const missing = fakeDatabase({ read: [], deleted: [] });
    expect((await failure(() => deletePlanEntry(missing.database, USER, ENTRY, 1))).code).toBe(
      "not_found",
    );

    const stale = fakeDatabase({ read: [planRow({ version: 4 })], deleted: [] });
    expect((await failure(() => deletePlanEntry(stale.database, USER, ENTRY, 1))).code).toBe(
      "stale_version",
    );

    const gone = fakeDatabase({ deleted: [{ id: ENTRY, subject_id: SUBJECT }] });
    await deletePlanEntry(gone.database, USER, ENTRY, 1);
    expect(events).toEqual([`PlanEntryDeleted:${ENTRY}`]);

    const noVersion = await failure(() => deletePlanEntry(gone.database, USER, ENTRY, null));
    expect(noVersion.code).toBe("version_required");
  });
});
