import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { runIdempotent } from "@/kernel/idempotency";
import * as profile from "@/modules/profile/public";
import * as timer from "@/modules/timer/public";
import { container } from "@/server/container";
import {
  enforceUserRate,
  requiredIdempotencyKey,
  requireIdentity,
  startTimerSchema,
} from "@/server/request-context";

/**
 * TIM-02 POST /api/app/timer/start (FR-050, FR-051, FR-053): begin a Pomodoro or stopwatch.
 * The unique `user_id` on `timer_runs` is the single-timer rule (BR-011); `replaceRunning`
 * ends the current run and starts this one in the same transaction (AC-FR-053-2).
 */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const key = requiredIdempotencyKey(request);
    const input = await readJson(request, startTimerSchema);
    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const context: timer.TimerContext = {
      now: new Date(),
      timezone: clock.timezone,
      rolloverHour: clock.rolloverHour,
    };
    const body: timer.StartTimerInput = {
      mode: input.mode,
      subjectId: input.subjectId,
      topicId: input.topicId ?? null,
      planEntryId: input.planEntryId ?? null,
      replaceRunning: input.replaceRunning ?? false,
    };

    const result = await runIdempotent({
      database: c.database,
      store: c.idempotency,
      userId: identity.userId,
      scope: "timer.start",
      key,
      payload: { method: "POST", path: "/api/app/timer/start", body: input },
      run: async (tx) => {
        const state = await timer.startTimer(tx, identity.userId, body, context);
        return { status: 201, body: state };
      },
    });

    const headers: Record<string, string> = {
      etag: `"${result.body.id}.${result.body.version}"`,
      location: "/api/app/timer",
    };
    if (result.replayed) headers["idempotent-replay"] = "true";
    return jsonResponse(result.status, result.body, requestId, headers);
  });
}
