-- M07 timer (MILESTONES.md M07; DATA-DICTIONARY.md section 7).
-- The timer is a thin server-authoritative state machine (MODULE-BOUNDARIES section 2):
-- at most one run per user (BR-011), whose only clock is `phase_ends_at`; study time is
-- the sum of the focus segments from stored timestamps (BR-012, NFR-090). Completed and
-- discarded runs leave no row (R2), so the table always holds the live run or nothing.

CREATE TABLE IF NOT EXISTS timer_runs (
  id                      uuid PRIMARY KEY,
  user_id                 uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id              uuid        NOT NULL,
  topic_id                uuid,
  plan_entry_id           uuid,
  mode                    text        NOT NULL CHECK (mode IN ('stopwatch','pomodoro')),
  state                   text        NOT NULL CHECK (state IN ('running','paused')),
  phase                   text        CHECK (phase IN ('focus','break','long_break')),
  phase_ends_at           timestamptz,
  cycle_index             smallint    NOT NULL DEFAULT 1 CHECK (cycle_index >= 1),
  pomodoros_completed     smallint    NOT NULL DEFAULT 0 CHECK (pomodoros_completed >= 0),
  focus_min               smallint    NOT NULL CHECK (focus_min BETWEEN 1 AND 120),
  break_min               smallint    NOT NULL CHECK (break_min BETWEEN 1 AND 60),
  long_break_min          smallint    NOT NULL CHECK (long_break_min BETWEEN 1 AND 60),
  cycles_before_long_break smallint   NOT NULL CHECK (cycles_before_long_break BETWEEN 2 AND 8),
  started_at              timestamptz NOT NULL,
  timezone                text        NOT NULL,
  local_date              date        NOT NULL,
  day_rollover_hour       smallint    NOT NULL CHECK (day_rollover_hour BETWEEN 0 AND 23),
  last_heartbeat_at       timestamptz NOT NULL,
  version                 integer     NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  -- BR-011: one live timer per user, across every tab and device.
  CONSTRAINT uq_timer_runs_user UNIQUE (user_id),
  -- The Pomodoro phase clock exists exactly for Pomodoro runs (DICT timer_runs.phase).
  CONSTRAINT chk_timer_runs_phase_mode CHECK (
    (mode = 'pomodoro') = (phase IS NOT NULL)
    AND (mode = 'pomodoro') = (phase_ends_at IS NOT NULL)
  ),
  -- FR-057: the durations are a snapshot, so a later settings change never moves a run.
  CONSTRAINT chk_timer_runs_stopwatch_counts CHECK (
    (mode = 'pomodoro') OR pomodoros_completed = 0
  ),
  -- Subjects and topics are archived, never deleted (BR-029), so both edges are NO ACTION
  -- and the users cascade removes the rows instead; a deleted plan entry unlinks (EC-022).
  CONSTRAINT fk_timer_runs_subject_user FOREIGN KEY (subject_id, user_id)
    REFERENCES subjects (id, user_id) ON DELETE NO ACTION,
  CONSTRAINT fk_timer_runs_topic_subject FOREIGN KEY (topic_id, subject_id)
    REFERENCES topics (id, subject_id) ON DELETE NO ACTION,
  CONSTRAINT fk_timer_runs_plan_entry FOREIGN KEY (plan_entry_id, user_id)
    REFERENCES plan_entries (id, user_id) ON DELETE SET NULL (plan_entry_id)
);

CREATE TABLE IF NOT EXISTS timer_run_segments (
  run_id     uuid        NOT NULL REFERENCES timer_runs (id) ON DELETE CASCADE,
  seq        smallint    NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at   timestamptz CHECK (ended_at IS NULL OR ended_at >= started_at),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, seq)
);

-- At most one open segment per run (DICT timer_run_segments): the running focus interval.
CREATE UNIQUE INDEX IF NOT EXISTS uq_timer_run_segments_open
  ON timer_run_segments (run_id) WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS timer_settings (
  user_id                   uuid     PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  focus_min                 smallint NOT NULL DEFAULT 25 CHECK (focus_min BETWEEN 1 AND 120),
  break_min                 smallint NOT NULL DEFAULT 5 CHECK (break_min BETWEEN 1 AND 60),
  long_break_min            smallint NOT NULL DEFAULT 15 CHECK (long_break_min BETWEEN 1 AND 60),
  cycles_before_long_break  smallint NOT NULL DEFAULT 4 CHECK (cycles_before_long_break BETWEEN 2 AND 8),
  -- Phase 2 audio (FR-180, FR-181): stored now so the column set never migrates twice.
  audio_loop                text     NOT NULL DEFAULT 'none'
                              CHECK (audio_loop IN ('none','rain','white_noise','cafe')),
  audio_volume              smallint NOT NULL DEFAULT 50 CHECK (audio_volume BETWEEN 0 AND 100),
  version                   integer  NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- INDEXING-STRATEGY section 2: the idle job scans by heartbeat (BR-006); the subject
-- archive guard asks whether a run is live on one subject (EC-007).
CREATE INDEX IF NOT EXISTS ix_timer_runs_heartbeat ON timer_runs (last_heartbeat_at);
CREATE INDEX IF NOT EXISTS ix_timer_runs_subject ON timer_runs (subject_id);
