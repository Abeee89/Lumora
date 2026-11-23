-- M06 study sessions (MILESTONES.md M06; DATA-DICTIONARY.md section 6).
-- Completed study facts, separate from the planned intent that measures nothing yet
-- (BR-001, BR-002). The overlap rule is a hard exclusion (EC-011), so it needs the
-- btree_gist extension for the equality side of the GiST exclusion constraint.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS study_sessions (
  id                  uuid PRIMARY KEY,
  user_id             uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id          uuid        NOT NULL,
  topic_id            uuid,
  plan_entry_id       uuid,
  source              text        NOT NULL CHECK (source IN ('timer','manual')),
  mode                text        CHECK (mode IN ('stopwatch','pomodoro')),
  started_at          timestamptz NOT NULL,
  ended_at            timestamptz NOT NULL CHECK (ended_at > started_at),
  duration_seconds    integer     NOT NULL CHECK (
                          duration_seconds >= 60 AND duration_seconds <= 86400
                          AND duration_seconds <= extract(epoch from (ended_at - started_at))
                        ),
  pomodoros_completed smallint    NOT NULL DEFAULT 0 CHECK (
                          pomodoros_completed >= 0
                          AND ((mode = 'pomodoro') OR pomodoros_completed = 0)
                        ),
  auto_closed         boolean     NOT NULL DEFAULT false,
  timezone            text        NOT NULL,
  local_date          date        NOT NULL,
  day_rollover_hour   smallint    NOT NULL CHECK (day_rollover_hour BETWEEN 0 AND 23),
  request_key         text        CHECK (char_length(request_key) <= 100),
  version             integer     NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- BR-010: a manual session has no timer mode, and only a timer session can have one.
  CONSTRAINT chk_study_sessions_manual_mode CHECK ((source = 'manual') = (mode IS NULL)),
  -- Subjects and topics are archived, never deleted (BR-029, EC-008), so both edges are
  -- NO ACTION and the users cascade removes the rows instead.
  CONSTRAINT fk_study_sessions_subject_user FOREIGN KEY (subject_id, user_id)
    REFERENCES subjects (id, user_id) ON DELETE NO ACTION,
  CONSTRAINT fk_study_sessions_topic_subject FOREIGN KEY (topic_id, subject_id)
    REFERENCES topics (id, subject_id) ON DELETE NO ACTION,
  -- BR-003, EC-022: deleting a plan entry keeps the session and unlinks it.
  CONSTRAINT fk_study_sessions_plan_entry FOREIGN KEY (plan_entry_id, user_id)
    REFERENCES plan_entries (id, user_id) ON DELETE SET NULL (plan_entry_id),
  CONSTRAINT uq_study_sessions_request UNIQUE (user_id, request_key),
  CONSTRAINT uq_study_sessions_id_user_subject UNIQUE (id, user_id, subject_id),
  CONSTRAINT ex_study_sessions_overlap EXCLUDE USING gist (
    user_id WITH =,
    tstzrange(started_at, ended_at, '[)') WITH &&
  )
);

CREATE TABLE IF NOT EXISTS study_session_days (
  session_id uuid  NOT NULL,
  local_date date  NOT NULL,
  user_id    uuid  NOT NULL,
  subject_id uuid  NOT NULL,
  seconds    integer NOT NULL CHECK (seconds > 0 AND seconds <= 86400),
  is_manual  boolean NOT NULL,
  is_ranked  boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, local_date),
  -- EC-008: a subject change on a session propagates to its days.
  CONSTRAINT fk_study_session_days_session FOREIGN KEY (session_id, user_id, subject_id)
    REFERENCES study_sessions (id, user_id, subject_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- INDEXING-STRATEGY section 2: the session list and history read newest first; the plan
-- actual is the sum over the linked sessions; the day allocations serve daily totals,
-- subject statistics and the ranked leaderboard minutes (EC-025, BR-018).
CREATE INDEX IF NOT EXISTS ix_study_sessions_user_started ON study_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ix_study_sessions_plan_entry ON study_sessions (plan_entry_id) WHERE plan_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_study_sessions_subject ON study_sessions (subject_id);
CREATE INDEX IF NOT EXISTS ix_study_sessions_topic ON study_sessions (topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_study_session_days_user_date
  ON study_session_days (user_id, local_date) INCLUDE (seconds, subject_id);
CREATE INDEX IF NOT EXISTS ix_study_session_days_user_subject_date
  ON study_session_days (user_id, subject_id, local_date) INCLUDE (seconds);
CREATE INDEX IF NOT EXISTS ix_study_session_days_ranked
  ON study_session_days (user_id, local_date) INCLUDE (seconds) WHERE is_ranked;
