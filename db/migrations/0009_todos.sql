-- M10 tasks and priorities (MILESTONES.md M10; DATA-DICTIONARY.md section 8).
-- A to-do is a task to complete, not a time block: no start or duration (FR-090). The
-- priority is one of three values (BR-031, FR-096), the due date is a plain local date
-- and a past date is accepted (FR-090). To-dos are hard-deleted, never archived (FR-092).
-- The composite foreign keys are NO ACTION: subjects and topics are archived, never
-- deleted (BR-029), so a to-do survives and returns on restore. The `done` invariant
-- keeps the boolean and the completion moment one fact (FR-093, AC-FR-093-1).

CREATE TABLE IF NOT EXISTS todos (
  id           uuid PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title        text        NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  subject_id   uuid,
  topic_id     uuid,
  due_date     date,
  priority     text        NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('high', 'medium', 'low')),
  done         boolean     NOT NULL DEFAULT false,
  completed_at timestamptz,
  version      integer     NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- DATABASE-CONSTRAINTS section 3: the completion moment is the done flag (FR-093).
  CONSTRAINT chk_todos_done_completed_at CHECK (done = (completed_at IS NOT NULL)),
  -- Composite FK pattern (DATABASE-CONSTRAINTS section 6): a to-do can never point at
  -- another user's subject (NFR-016, NFR-092).
  CONSTRAINT fk_todos_subject_user FOREIGN KEY (subject_id, user_id)
    REFERENCES subjects (id, user_id) ON DELETE NO ACTION,
  -- A topic always names its own subject; `topic_id IS NULL OR subject_id IS NOT NULL`
  -- is implied by the composite FK below (topic_id requires subject_id).
  CONSTRAINT fk_todos_topic_subject FOREIGN KEY (topic_id, subject_id)
    REFERENCES topics (id, subject_id) ON DELETE NO ACTION
);

-- INDEXING-STRATEGY section 6: the default list (open first, priority, due, age) is a
-- partial-index scan of at most 500 rows per user, which satisfies NFR-002 (FR-095).
CREATE INDEX IF NOT EXISTS ix_todos_user_list
  ON todos (user_id, done, priority, due_date NULLS LAST, created_at);
CREATE INDEX IF NOT EXISTS ix_todos_open_due
  ON todos (user_id, due_date) WHERE done = false;
-- The composite foreign key checks on subjects and topics use these too (R4).
CREATE INDEX IF NOT EXISTS ix_todos_subject ON todos (subject_id) WHERE subject_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_todos_topic ON todos (topic_id) WHERE topic_id IS NOT NULL;
