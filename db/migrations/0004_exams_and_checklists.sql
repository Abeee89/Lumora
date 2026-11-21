-- 0004_exams_and_checklists.sql
-- M04: Exams (FR-120..FR-125) and the exam topic checklist (FR-122).
-- Archived state is derived (BR-025): an exam is archived when exam_date is
-- before the user's local today, so there is no archived_at column and no
-- update marks it.

CREATE TABLE exams (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL,
  title       text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  exam_date   date NOT NULL,
  version     integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at  timestamptz NOT NULL,
  updated_at  timestamptz NOT NULL,
  UNIQUE (id, user_id),
  UNIQUE (id, subject_id),
  FOREIGN KEY (subject_id, user_id) REFERENCES subjects (id, user_id) ON DELETE CASCADE
);

CREATE TABLE exam_topics (
  exam_id     uuid NOT NULL,
  topic_id    uuid NOT NULL,
  subject_id  uuid NOT NULL,
  completed   boolean NOT NULL DEFAULT false,
  weight      smallint NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 5),
  created_at  timestamptz NOT NULL,
  updated_at  timestamptz NOT NULL,
  PRIMARY KEY (exam_id, topic_id),
  FOREIGN KEY (exam_id, subject_id) REFERENCES exams (id, subject_id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id, subject_id) REFERENCES topics (id, subject_id) ON DELETE CASCADE
);

CREATE INDEX ix_exams_user_date ON exams (user_id, exam_date, id);
CREATE INDEX ix_exam_topics_exam ON exam_topics (exam_id);
