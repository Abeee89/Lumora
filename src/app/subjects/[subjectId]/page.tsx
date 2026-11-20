import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isUuid } from "@/kernel/crypto";
import { getSubject, subjectPalette, type Subject } from "@/modules/subjects/public";
import { container } from "@/server/container";
import { currentSession } from "@/server/session";
import { Panel, TextLink } from "@/ui/control";
import { SubjectWorkspace } from "@/ui/forms/subject-workspace";

type RouteContext = { params: Promise<{ subjectId: string }> };

async function findSubject(subjectId: string): Promise<Subject | null> {
  const session = await currentSession();
  if (session === null || !isUuid(subjectId)) return null;
  try {
    return await getSubject(container().database, session.userId, subjectId);
  } catch {
    // Someone else's id and a malformed id both answer not_found (API-ENDPOINTS SUBJ-03).
    return null;
  }
}

export async function generateMetadata({ params }: RouteContext): Promise<Metadata> {
  const subject = await findSubject((await params).subjectId);
  return { title: subject === null ? "Subject · Lumora" : `${subject.name} · Lumora` };
}

/** A-8 Subject details (FR-010, FR-011, FR-015 to FR-019). */
export default async function SubjectPage({ params }: RouteContext) {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  const subject = await findSubject((await params).subjectId);

  if (subject === null) {
    return (
      <div className="mx-auto max-w-[960px] space-y-6">
        <nav aria-label="Breadcrumb" className="text-sm">
          <TextLink href="/subjects" className="inline-flex min-h-11 items-center">
            Back to Subjects
          </TextLink>
        </nav>
        <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
          Subject
        </h1>
        <Panel className="space-y-3">
          <h2 className="text-base font-semibold text-ink">We could not find that page</h2>
          <p className="text-sm text-ink-2">
            The subject may have been deleted, or the link may belong to another account.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <TextLink href="/subjects">Open Subjects</TextLink>
            <TextLink href="/">Go to Dashboard</TextLink>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px]">
      <SubjectWorkspace subject={subject} palette={subjectPalette} />
    </div>
  );
}