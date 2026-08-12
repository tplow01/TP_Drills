-- supabase/migrations/0008_age_bands_and_step_sequences.sql
-- Two independent additions for the add-drill experience revamp
-- (design doc, 2026-08-12):
--   1. age_band gains two bands the enum comment in 0001 already
--      anticipated (U12-U14, U15-U18) -- additive, no data migration.
--   2. drill_diagram gains sequence_group: diagrams sharing a non-null
--      value render as Step 1 / Step 2 / Step 3 tabs, ordered by the
--      existing `position` column. ALTER TYPE ... ADD VALUE cannot run
--      in the same transaction block as a statement that uses the new
--      value, but this file only adds the values -- nothing here reads
--      them -- so a single migration file is safe.

alter type age_band add value 'U12-U14';
alter type age_band add value 'U15-U18';

alter table drill_diagram
  add column sequence_group uuid;

create index drill_diagram_sequence_group_idx
  on drill_diagram (sequence_group)
  where sequence_group is not null;
