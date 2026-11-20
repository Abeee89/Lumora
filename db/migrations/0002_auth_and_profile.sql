-- M02 authentication and profile (MILESTONES.md M02; DATA-DICTIONARY.md sections 1 and 2).
-- idempotency_keys lands here because its primary key carries a FK to users (B-06).

CREATE TABLE IF NOT EXISTS users (
  id                  uuid PRIMARY KEY,
  email               text        NOT NULL,
  email_verified      boolean     NOT NULL DEFAULT false,
  age_confirmed_at    timestamptz NOT NULL,
  failed_sign_in_count smallint   NOT NULL DEFAULT 0 CHECK (failed_sign_in_count >= 0),
  locked_until        timestamptz,
  deletion_requested_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS auth_accounts (
  id                  uuid PRIMARY KEY,
  user_id             uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider            text        NOT NULL CHECK (provider IN ('credential', 'google')),
  provider_account_id text        NOT NULL,
  password_hash       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_accounts_credential_hash
    CHECK ((provider = 'credential') = (password_hash IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_provider_account_idx
  ON auth_accounts (provider, provider_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_user_provider_idx
  ON auth_accounts (user_id, provider);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id             uuid PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash     text        NOT NULL UNIQUE,
  expires_at     timestamptz NOT NULL,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  ip             inet,
  user_agent     text        CHECK (user_agent IS NULL OR char_length(user_agent) <= 512),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_active_idx
  ON auth_sessions (user_id, last_active_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_verifications (
  id          uuid PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose     text        NOT NULL CHECK (purpose IN ('password_reset')),
  token_hash  text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_verifications_user_idx ON auth_verifications (user_id);

CREATE TABLE IF NOT EXISTS auth_audit_events (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users (id) ON DELETE CASCADE,
  event_type  text NOT NULL CHECK (event_type IN (
    'sign_in', 'sign_in_failed', 'lockout', 'password_reset', 'session_revoked', 'account_deleted'
  )),
  ip          inet,
  user_agent  text CHECK (user_agent IS NULL OR char_length(user_agent) <= 512),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_audit_events_occurred_idx ON auth_audit_events (occurred_at);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id                uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  display_name           text        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  timezone               text        NOT NULL,
  rollover_hour          smallint    NOT NULL DEFAULT 0 CHECK (rollover_hour BETWEEN 0 AND 23),
  theme                  text        NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  primary_goal           text        CHECK (primary_goal IN ('exam_prep', 'coursework', 'self_learning')),
  onboarding_completed_at timestamptz,
  onboarding_dismissed_at timestamptz,
  onboarding_steps       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  version                integer     NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  user_id         uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  scope           text        NOT NULL,
  key             text        NOT NULL,
  request_hash    text        NOT NULL,
  response_status smallint    NOT NULL,
  response_body   jsonb,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope, key)
);

CREATE INDEX IF NOT EXISTS idempotency_keys_expiry_idx ON idempotency_keys (expires_at);