CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  openid TEXT NOT NULL UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT,
  session_token TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS gear_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_gears (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gear_type_id TEXT NOT NULL REFERENCES gear_types(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  room_code TEXT NOT NULL UNIQUE,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  display_order INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  creator_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  scope TEXT NOT NULL CHECK (scope IN ('personal', 'team')),
  team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CHECK (end_date >= start_date),
  CHECK ((scope = 'personal' AND team_id IS NULL) OR (scope = 'team' AND team_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS event_participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'joined', 'rejected', 'left')),
  source TEXT NOT NULL CHECK (source IN ('creator', 'invited', 'self_joined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS event_gear_requirements (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gear_type_id TEXT NOT NULL REFERENCES gear_types(id) ON DELETE RESTRICT,
  user_gear_id TEXT NOT NULL REFERENCES user_gears(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  assigned_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, participant_user_id, user_gear_id)
);

CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_team ON events(team_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON event_participants(user_id, status);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id, left_at);

INSERT INTO gear_types (id, name, icon_key, is_system)
VALUES
  ('gear_quickdraw', '快挂', 'Q', true),
  ('gear_locking_carabiner', '主锁', 'L', true),
  ('gear_cam', '机械塞', 'C', true),
  ('gear_rope', '绳索', 'R', true)
ON CONFLICT (id) DO NOTHING;
