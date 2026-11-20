/**
 * Public interface of the Topics module (MODULE-BOUNDARIES section 2). The topic-event
 * contract is part of it: Exams registers a subscriber at composition time (section 3).
 */
export {
  archiveTopic,
  bulkCreateTopics,
  createTopic,
  editTopic,
  exportTopics,
  getTopic,
  listTopics,
  normaliseBulkLines,
  previewBulkTopics,
  purgeTopics,
  reorderTopics,
  restoreTopic,
  topicStatuses,
  type BulkTopicsInput,
  type BulkTopicsPreview,
  type Topic,
  type TopicPatch,
} from "./service";
export {
  publishTopicEvent,
  topicEventSubscribers,
  type TopicEvent,
  type TopicEventSubscriber,
  type TopicStatus,
} from "./events";
