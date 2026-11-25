-- M08 daily and subject goals (MILESTONES.md M08; DATA-DICTIONARY.md section 11).
-- The daily target is a dated history, not a version column: a change upserts the row of the
-- current local day, so past days keep the target that was in force on them (BR-015, FR-074,
-- EC-005). Per-subject targets are optional and stay while their subject is archived
-- (FR-071, AC-FR-071-4). Progress is never stored: it is computed from the frozen local
-- dates M06 writes in `study_session_days` (BR-014, DICT section 11).

CREATE TABLE IF NOT EXISTS daily_goal_history (
  user_id         uuid       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  effective_from  date       NOT NULL,
  -- BR-013, EC-023: whole minutes 5..1440; the value mirrors config.goal.defaultMinutes.
  target_minutes  smallint   NOT NULL CHECK (target_minutes BETWEEN 5 AND 1440),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- DATABASE-CONSTRAINTS section 3: a same-day change upserts this key (FR-074, EC-005).
  PRIMARY KEY (user_id, effective_from)
);

CREATE TABLE IF NOT EXISTS subject_goals (
  user_id         uuid       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id      uuid       NOT NULL,
  target_minutes  smallint   NOT NULL CHECK (target_minutes BETWEEN 5 AND 1440),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, subject_id),
  -- DATABASE-CONSTRAINTS section 4: subjects are archived, never deleted (BR-029), so this
  -- edge is NO ACTION and the goal survives an archive and returns on restore.
  CONSTRAINT fk_subject_goals_subject FOREIGN KEY (subject_id, user_id)
    REFERENCES subjects (id, user_id) ON DELETE NO ACTION
);

-- INDEXING-STRATEGY section 2: the foreign-key check on subject (R4).
CREATE INDEX IF NOT EXISTS ix_subject_goals_subject ON subject_goals (subject_id);

-- BR-013: an account starts on the default target from its registration local date. M08
-- seeds a new account at sign-up; this backfills the accounts that predate the table.
INSERT INTO daily_goal_history (user_id, effective_from, target_minutes)
SELECT u.id, (u.created_at AT TIME ZONE p.timezone)::date, 120
FROM users u
JOIN user_profiles p ON p.user_id = u.id
ON CONFLICT (user_id, effective_from) DO NOTHING;
