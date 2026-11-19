-- M01 shared kernel (MILESTONES.md; DATA-DICTIONARY.md section 17).
-- idempotency_keys is intentionally absent: it carries a FK to users and ships in M02 (B-06).

CREATE TABLE IF NOT EXISTS outbox_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_name        text        NOT NULL,
  idempotency_key text        NOT NULL UNIQUE,
  payload         jsonb       NOT NULL,
  relayed_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbox_events_unrelayed_idx
  ON outbox_events (id)
  WHERE relayed_at IS NULL;

CREATE UNLOGGED TABLE IF NOT EXISTS rate_limit_counters (
  bucket       text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer     NOT NULL CHECK (hits >= 1),
  PRIMARY KEY (bucket, window_start)
);