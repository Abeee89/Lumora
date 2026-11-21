import { isUuid } from "@/kernel/crypto";
import { AppError } from "@/kernel/errors";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { localDateOf } from "@/kernel/time";
import * as exams from "@/modules/exams/public";
import * as profile from "@/modules/profile/public";
import { container } from "@/server/container";
import { enforceUserRate, ifMatchVersion, requireIdentity, updateExamSchema } from "@/server/request-context";

async function examIdOf(context: { params: Promise<{ examId: string }> }): Promise<string> {
  const { examId } = await context.params;
  if (!isUuid(examId)) throw new AppError("not_found");
  return examId;
}

/** EXAM-03 GET /api/app/exams/{examId} (FR-122, FR-123). */
export async function GET(
  request: Request,
  context: { params: Promise<{ examId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "read");

    const examId = await examIdOf(context);
    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const today = localDateOf(new Date(), clock.timezone, clock.rolloverHour);
    const exam = await exams.getExam(c.database, identity.userId, examId, today);
    return jsonResponse(200, exam, requestId, { etag: `"${exam.version}"` });
  });
}

/** EXAM-04 PATCH /api/app/exams/{examId} (FR-121, FR-125). `If-Match` is required (ADR-011). */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ examId: string }> },
): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const identity = await requireIdentity(request, c);
    await enforceUserRate(c, identity, "write");

    const examId = await examIdOf(context);
    const input = await readJson(request, updateExamSchema);
    const patch: exams.ExamPatch = {};
    if (input.subjectId !== undefined) patch.subjectId = input.subjectId;
    if (input.title !== undefined) patch.title = input.title;
    if (input.examDate !== undefined) patch.examDate = input.examDate;

    const clock = await profile.getUserClockContext(c.database, identity.userId);
    const today = localDateOf(new Date(), clock.timezone, clock.rolloverHour);
    const exam = await exams.editExam(
      c.database,
      identity.userId,
      examId,
      ifMatchVersion(request),
      patch,
      today,
    );
    return jsonResponse(200, exam, requestId, { etag: `"${exam.version}"` });
  });
}