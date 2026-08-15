-- supabase/migrations/0010_team_color.sql
-- A coach can now choose a team's color instead of it always being derived
-- from list position (design doc, 2026-08-15). Additive, no backfill: an
-- existing team's `color` stays null, which the app already treats as
-- "fall back to the index-based cycling every team used before this."

alter table team
  add column color text;
