import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import * as timer from "@/modules/timer/public";
import { container } from "@/server/container";
import {
  enforceUserRate,
  ifMatchVersion,
  requireIdentity,
  updateTimerSettingsSchema,
} from "@/server/request-context";

/**
 * TIM-07 GET /api/app/timer/settings (FR-057): the durations the next run will snapshot.
 * With no row the configuration defaults answer at version 0, so nothing is created here.
 */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const settings = await timer.getTimerSettings(c.database, identity.userId);
    return jsonResponse(200, settings, requestId, { etag: `"${settings.version}"` });
  });
}

/**
 * TIM-08 PATCH /api/app/timer/settings (FR-057): change the durations. A running timer keeps
 * the snapshot it started with; the row is created lazily, which is why the first call may
 * omit `If-Match` or send `"0"` (API-ENDPOINTS TIM-08).
 */
export async function PATCH(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const input = await readJson(request, updateTimerSettingsSchema);
    const patch: timer.UpdateTimerSettingsInput = {};
    if (input.focusMin !== undefined) patch.focusMin = input.focusMin;
    if (input.breakMin !== undefined) patch.breakMin = input.breakMin;
    if (input.longBreakMin !== undefined) patch.longBreakMin = input.longBreakMin;
    if (input.cyclesBeforeLongBreak !== undefined) {
      patch.cyclesBeforeLongBreak = input.cyclesBeforeLongBreak;
    }
    if (input.audioLoop !== undefined) patch.audioLoop = input.audioLoop;
    if (input.audioVolume !== undefined) patch.audioVolume = input.audioVolume;

    const settings = await c.database.transaction((tx) =>
      timer.updateTimerSettings(tx, identity.userId, ifMatchVersion(request), patch),
    );
    return jsonResponse(200, settings, requestId, { etag: `"${settings.version}"` });
  });
}
