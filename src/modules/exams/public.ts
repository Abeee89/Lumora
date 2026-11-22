/**
 * Public interface of the Exams module (MODULE-BOUNDARIES section 2). The event
 * contract and the checklist-drop subscriber are part of it: Topics publishes the
 * archived event, Exams consumes it at composition time (section 3).
 */
export {
  countdownOf,
  createExam,
  daysBetween,
  decodeCursor,
  encodeCursor,
  exportExams,
  editExam,
  getExam,
  listExams,
  purgeExams,
  setExamTopic,
  setExamTopics,
  upcomingExamsBySubject,
  type Exam,
  type ExamChecklistItem,
  type ExamCountdown,
  type ExamPatch,
  type ExamState,
  type UpcomingExam,
} from "./service";
export {
  dropArchivedTopicFromChecklists,
} from "./subscribe";
export {
  examAutoArchiveJob,
} from "./job";
export {
  examEventSubscribers,
  publishExamEvent,
  type ExamEvent,
  type ExamEventSubscriber,
} from "./events";
