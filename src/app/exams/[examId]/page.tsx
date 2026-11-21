import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isUuid } from "@/kernel/crypto";
import { localDateOf } from "@/kernel/time";
import { getExam, type Exam } from "@/modules/exams/public";
import { getSubject } from "@/modules/subjects/public";
import { getUserClockContext } from "@/modules/profile/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import { Panel, TextLink } from "@/ui/control";
import { ExamWorkspace } from "@/ui/forms/exam-workspace";

type RouteContext = { params: Promise<{ examId: string }> };

async function findExam(examId: string): Promise<{ exam: Exam; subjectName: string } | null> {
  const session = await currentSession();
  if (session === null || !isUuid(examId)) return null;
  const c = container();
  try {
    const clock = await getUserClockContext(c.database, session.userId);
    const today = localDateOf(new Date(), clock.timezone, clock.rolloverHour);
    const exam = await getExam(c.database, session.userId, examId, today);
    const subject = await getSubject(c.database, session.userId, exam.subjectId);
    return { exam, subjectName: subject.name };
  } catch {
    // Someone else's id and a malformed id both answer not_found (EXAM-03).
    return null;
  }
}

export async function generateMetadata({ params }: RouteContext): Promise<Metadata> {
  const found = await findExam((await params).examId);
  return { title: found === null ? "Exam · Lumora" : `${found.exam.title} · Lumora` };
}

/** A-13 Exam detail (FR-122, FR-123, FR-125). */
export default async function ExamPage({ params }: RouteContext) {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const found = await findExam((await params).examId);

  if (found === null) {
    return (
      <div className="mx-auto max-w-[960px] space-y-6">
        <nav aria-label="Breadcrumb" className="text-sm">
          <TextLink href="/exams" className="inline-flex min-h-11 items-center">
            Back to Exams
          </TextLink>
        </nav>
        <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
          Exam
        </h1>
        <Panel className="space-y-3">
          <h2 className="text-base font-semibold text-ink">We could not find that page</h2>
          <p className="text-sm text-ink-2">
            The exam may have been deleted, or the link may belong to another account.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <TextLink href="/exams">Open Exams</TextLink>
            <TextLink href="/">Go to Dashboard</TextLink>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px]">
      <ExamWorkspace exam={found.exam} subjectName={found.subjectName} />
    </div>
  );
}