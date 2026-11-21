import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listSubjects, type SubjectListItem } from "@/modules/subjects/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import { ExamList } from "@/ui/forms/exam-list";

export const metadata: Metadata = { title: "Exams · Lumora" };

async function findSubjects(): Promise<SubjectListItem[]> {
  const session = await currentSession();
  if (session === null) return [];
  return listSubjects(container().database, session.userId, false);
}

/** A-12 Exams (FR-120, FR-125). */
export default async function ExamsPage() {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const subjects = await findSubjects();
  const options = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    colour: subject.color,
  }));

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Exams
      </h1>
      <p className="text-ink-2">
        One exam per subject, with a fixed date and a checklist of topics to cover. Archived
        exams stay visible until their date is moved to today or later.
      </p>
      <ExamList subjects={options} />
    </div>
  );
}