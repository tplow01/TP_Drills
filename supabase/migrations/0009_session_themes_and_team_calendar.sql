-- 2026-08-14 navigation/visual revamp: a session's theme tags (reuses the
-- existing drill_type enum — a session's theme is the same taxonomy as a
-- drill's type, no new enum needed), and a team-level calendar subscription
-- (design spec's "+ Session > paste a calendar link" flow). No sync job is
-- built here — this migration only adds somewhere to store the URL and the
-- last-synced timestamp; the actual feed fetch/parse is out of scope for
-- this pass (see 2026-08-14-navigation-visual-revamp-design.md).

alter table session
  add column themes drill_type[] not null default '{}';

alter table team
  add column calendar_url text,
  add column calendar_synced_at timestamptz;
