/**
 * MODULE-BOUNDARIES section 6: Goals consumes the Study sessions events, because a session
 * write is what moves a day's progress (FR-072). A write that pushes a day from below its
 * target to at or above it publishes `GoalMet` once for that day (APPLICATION-FLOWS
 * section 7 step 5). A delete can only lower progress, so it publishes nothing, and the
 * day is simply reported as not met again (AC-FR-073-4).
 *
 * Registered at composition time from the Study sessions event contract; the event is
 * published after the write commits, so the allocations are always visible here.
 */
import type { Queryable } from "../../kernel/db";
import * as sessions from "../sessions/public";
import { publishGoalEvent } from "./events";
import { targetMinutesFor } from "./service";

export async function goalMetAfterSessionWrite(
  event: sessions.SessionEvent,
  database: Queryable,
): Promise<void> {
  if (event.type === "SessionDeleted") return;
  const own = await sessions.sessionDaySeconds(database, event.userId, event.sessionId);
  if (own.length === 0) return;

  const writtenSeconds = new Map<string, number>();
  for (const row of own) {
    writtenSeconds.set(row.localDate, (writtenSeconds.get(row.localDate) ?? 0) + row.seconds);
  }

  for (const [date, written] of writtenSeconds) {
    const targetMinutes = await targetMinutesFor(database, event.userId, date);
    const targetSeconds = targetMinutes * 60;
    const allocations = await sessions.daySeconds(database, event.userId, date);
    const total = allocations.reduce((sum, row) => sum + row.seconds, 0);
    // Only the write that crosses the target publishes: at or above it now, below it
    // without these seconds (BR-015, FR-073).
    if (total < targetSeconds || total - written >= targetSeconds) continue;
    await publishGoalEvent({
      type: "GoalMet",
      userId: event.userId,
      localDate: date,
      minutes: Math.floor(total / 60),
      targetMinutes,
      occurredAt: event.occurredAt,
    });
  }
}
