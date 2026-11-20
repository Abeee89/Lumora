import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { subjectPalette } from "@/modules/subjects/public";
import { currentSession } from "@/server/session";
import { SubjectList } from "@/ui/forms/subject-list";

export const metadata: Metadata = { title: "Subjects · Lumora" };

/** A-7 Subjects (FR-010 to FR-014). */
export default async function SubjectsPage() {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        Subjects
      </h1>
      <p className="text-ink-2">
        Sessions, plans, tasks and notes belong to a subject. Archiving hides one without
        losing its history.
      </p>
      <SubjectList palette={subjectPalette} />
    </div>
  );
}