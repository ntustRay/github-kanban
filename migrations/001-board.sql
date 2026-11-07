CREATE TABLE IF NOT EXISTS board_cards (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  repo_id text NOT NULL,
  full_name text NOT NULL,
  metadata jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('backlog','in_progress','verify','formal','archive')),
  notes text NOT NULL DEFAULT '' CHECK (length(notes)<=20000),
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','manual')),
  position double precision NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,repo_id)
);
CREATE INDEX IF NOT EXISTS board_cards_user_visible ON board_cards(user_id,visible);
CREATE TABLE IF NOT EXISTS board_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scope text NOT NULL CHECK (scope IN ('read','write')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '90 days',
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS board_tokens_user ON board_tokens(user_id);
CREATE TABLE IF NOT EXISTS board_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  repo_id text NOT NULL,
  actor text NOT NULL,
  old_status text NOT NULL,
  new_status text NOT NULL,
  notes_changed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS board_activity_user_repo ON board_activity(user_id,repo_id,created_at DESC);
CREATE TABLE IF NOT EXISTS board_sync (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS board_presets (
  github_id text NOT NULL,
  repo_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('backlog','in_progress','verify','formal','archive')),
  reason text NOT NULL,
  PRIMARY KEY(github_id,repo_id)
);
