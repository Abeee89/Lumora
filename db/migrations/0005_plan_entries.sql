-- M05 plan entries (MILESTONES.md M05; DATA-DICTIONARY.md section 5).
-- Planned intent, separate from the recorded sessions that measure what happened
-- (BR-001, BR-002). Overlap is advisory (BR-026), so there is no exclusion constraint;
-- immutability of a started entry (BR-028) is a service rule that reads server time.

CREATE TABLE IF NOT EXISTS plan_entries (
  id           uuid PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id   uuid        NOT NULL,
  topic_id     uuid,
  starts_at    timestamptz NOT NULL,
  duration_min smallint    NOT NULL CHECK (duration_min BETWEEN 5 AND 480),
  timezone     text        NOT NULL,
  local_date   date        NOT NULL,
  missed_at    timestamptz,
  version      integer     NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- Subjects and topics are archived, never deleted (BR-029, EC-008), so both edges are
  -- NO ACTION and the users cascade removes the rows instead.
  CONSTRAINT fk_plan_entries_subject_user FOREIGN KEY (subject_id, user_id)
    REFERENCES subjects (id, user_id) ON DELETE NO ACTION,
  CONSTRAINT fk_plan_entries_topic_subject FOREIGN KEY (topic_id, subject_id)
    REFERENCES topics (id, subject_id) ON DELETE NO ACTION,
  CONSTRAINT uq_plan_entries_id_user UNIQUE (id, user_id)
);

-- INDEXING-STRATEGY section 1: the range read (FR-037) and the overlap check (BR-026)
-- both order by start; the local date carries planned minutes per day (BR-004).
CREATE INDEX IF NOT EXISTS ix_plan_entries_user_starts ON plan_entries (user_id, starts_at);
CREATE INDEX IF NOT EXISTS ix_plan_entries_user_date ON plan_entries (user_id, local_date);
CREATE INDEX IF NOT EXISTS ix_plan_entries_subject ON plan_entries (subject_id);
CREATE INDEX IF NOT EXISTS ix_plan_entries_topic ON plan_entries (topic_id) WHERE topic_id IS NOT NULL;
