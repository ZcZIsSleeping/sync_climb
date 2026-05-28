DROP INDEX IF EXISTS idx_events_creator_personal_dates;
DROP INDEX IF EXISTS idx_events_team_scope_dates;

ALTER TABLE events DROP COLUMN IF EXISTS scope;

CREATE INDEX IF NOT EXISTS idx_events_creator_dates
  ON events(creator_user_id, deleted_at, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_team_dates
  ON events(team_id, deleted_at, start_date, end_date);
