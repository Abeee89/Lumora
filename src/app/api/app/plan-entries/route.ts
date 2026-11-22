import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { runIdempotent } from "@/kernel/idempotency";
import * as plans from "@/modules/plans/public";
import * as profile from "@/modules/profile/public";
import { container } from "@/server/container";
import {
  createPlanEntrySchema,
  enforceUserRate,
  planEntryListQuery,
  requiredIdempotencyKey,
  requireIdentity,
} from "@/server/request-context";

/** PLAN-01 GET /api/app/plan-entries (FR-037). Unpaginated: the 93-day range bounds it. */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const parsed = planEntryListQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) {
      throw new AppError("validation_failed", {
        details: {
          fields: parsed.error.issues.map((issue) => ({
            path: issue.path.join(".") || "query",
            rule: issue.code,
          })),
        },
      });
    }

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const entries = await plans.listPlanEntries(c.database, identity.userId, parsed.data, {
      now: new Date(),
      timezone: clock.timezone,
      rolloverHour: clock.rolloverHour,
    });
    return jsonResponse(200, { data: entries }, requestId);
  });
}

/** PLAN-02 POST /api/app/plan-entries (FR-030). Warnings need confirmation (BR-026, FR-038). */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const key = requiredIdempotencyKey(request);
    const input = await readJson(request, createPlanEntrySchema);
    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const context: plans.PlanContext = {
      now: new Date(),
      timezone: clock.timezone,
      rolloverHour: clock.rolloverHour,
    };

    const result = await runIdempotent({
      database: c.database,
      store: c.idempotency,
      userId: identity.userId,
      scope: "plan_entry.create",
      key,
      payload: { method: "POST", path: "/api/app/plan-entries", body: input },
      run: async (tx) => {
        const created = await plans.createPlanEntry(tx, identity.userId, input, context);
        return { status: 201, body: { ...created.entry, warnings: created.warnings } };
      },
    });

    const headers: Record<string, string> = {
      etag: `"${result.body.version}"`,
      location: `/api/app/plan-entries/${result.body.id}`,
    };
    if (result.replayed) headers["idempotent-replay"] = "true";
    return jsonResponse(result.status, result.body, requestId, headers);
  });
}