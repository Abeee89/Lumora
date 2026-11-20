/**
 * Public interface of the Subjects module (MODULE-BOUNDARIES section 2). The archive-guard
 * registration point is re-exported here because the module catalog lists it as part of
 * this interface: Timer registers "a run on this subject blocks archive" (EC-007).
 */
export {
  archiveSubject,
  createSubject,
  editSubject,
  exportSubjects,
  getSubject,
  isSubjectColor,
  listSubjects,
  purgeSubjects,
  reorderSubjects,
  restoreSubject,
  subjectPalette,
  type Subject,
  type SubjectColor,
  type SubjectListItem,
  type SubjectPatch,
} from "./service";
export { archiveGuards, type ArchiveCheck, type ArchiveGuard } from "../../kernel/registries";
