import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { localDateOf } from "@/kernel/time";
import * as exams from "@/modules/exams/public";
import * as profile from "@/modules/profile/public";
import { container } from "@/server/container";
import { enforceUserRate, requireIdentity, setExamTopicSchema } from "@/server/request-context";

/** EXAM-06 PUT /api/app/exams/{examId}/topics/{topicId} (FR-123). Idempotent set of `completed`. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ examId: string; topicId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const { examId, topicId } = await context.params;
    if (!isUuid(examId) || !isUuid(topicId)) throw new AppError("not_found");

    const input = await readJson(request, setExamTopicSchema);
    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const today = localDateOf(new Date(), clock.timezone, clock.rolloverHour);
    const exam = await exams.setExamTopic(c.database, identity.userId, examId, topicId, input.completed, today);
    return jsonResponse(200, exam, requestId, { etag: `"${exam.version}"` });
  });
}