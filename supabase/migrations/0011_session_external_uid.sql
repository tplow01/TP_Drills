-- supabase/migrations/0011_session_external_uid.sql
-- Lets a session remember which BYGA calendar event created it, so a
-- repeat "Sync now" never imports the same fixture twice (design doc,
-- 2026-08-15). The partial unique index only applies to imported sessions
-- (external_uid is null for every manually-created one) and further
-- guards against a double-import race between two syncs firing close
-- together for the same team.

alter table session
  add column external_uid text;

create unique index session_team_external_uid_idx
  on session (team_id, external_uid)
  where external_uid is not null;
