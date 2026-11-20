-- M03 subjects and topics (MILESTONES.md M03; DATA-DICTIONARY.md section 3).
-- Subjects are archived, never deleted (BR-029), so the composite child foreign keys use
-- NO ACTION and the users cascade removes both tables in one statement.

CREATE TABLE IF NOT EXISTS subjects (
  id          uuid PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  color       text        NOT NULL CHECK (color IN (
                'teal', 'red', 'blue', 'brown', 'violet',
                'green', 'plum', 'slate', 'rust', 'cyan')),
  position    integer     NOT NULL CHECK (position >= 0),
  archived_at timestamptz,
  version     integer     NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_subjects_id_user UNIQUE (id, user_id)
);

-- uq_subjects_active_name: the duplicate-name rule covers active subjects only, so an
-- archived subject never blocks a name and a restore can be told to rename first (FR-014).
CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_active_name
  ON subjects (user_id, lower(btrim(name)))
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_subjects_user_position ON subjects (user_id, position);

CREATE TABLE IF NOT EXISTS topics (
  id          uuid PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id  uuid        NOT NULL,
  name        text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 150),
  weight      smallint    NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 5),
  status      text        NOT NULL DEFAULT 'not_started'
                          CHECK (status IN ('not_started', 'in_progress', 'done')),
  position    integer     NOT NULL CHECK (position >= 0),
  archived_at timestamptz,
  version     integer     NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_topics_subject_user FOREIGN KEY (subject_id, user_id)
    REFERENCES subjects (id, user_id) ON DELETE NO ACTION,
  CONSTRAINT uq_topics_id_subject UNIQUE (id, subject_id)
);

-- Full rather than partial: the composite foreign key check on subjects uses it too.
CREATE INDEX IF NOT EXISTS ix_topics_subject_position ON topics (subject_id, position);
CREATE INDEX IF NOT EXISTS ix_topics_user ON topics (user_id);
