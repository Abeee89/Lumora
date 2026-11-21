/**
 * EC-008: when a topic is archived, every exam checklist that contains it drops the row.
 * Registered at composition time from the Topics event contract (MODULE-BOUNDARIES
 * section 3). `TopicArchived` is published after the write commits, so this always
 * deletes checklist rows whose topic is already archived.
 */
import type { Queryable } from "../../kernel/db";
import type { TopicEvent } from "../topics/public";

export async function dropArchivedTopicFromChecklists(
  event: TopicEvent,
  database: Queryable,
): Promise<void> {
  if (event.type !== "TopicArchived") return;
  await database.query(
    `DELETE FROM exam_topics x
     USING topics t
     WHERE x.topic_id = $1 AND x.subject_id = $2
       AND t.id = $1 AND t.archived_at IS NOT NULL`,
    [event.topicId, event.subjectId],
  );
}
