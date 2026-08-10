-- supabase/migrations/0006_notes_as_lists.sql
-- Setup and How it works become repeating bullet-point lists, matching
-- coaching_points, instead of single free-text paragraphs (drill diagrams +
-- structured notes design, 2026-08-10). Existing text is split on newlines,
-- blank lines dropped -- nothing is lost, just reshaped.
--
-- complete_fields_required references setup/how_it_works via btrim(text),
-- which does not exist for text[] -- ALTER COLUMN ... TYPE re-validates all
-- constraints against the new type, so the constraint must be dropped before
-- the type change and recreated afterward using the array-typed check.

alter table drill
  drop constraint complete_fields_required;

alter table drill
  alter column setup drop default;

alter table drill
  alter column setup type text[]
  using (
    select coalesce(array_agg(entry), '{}')
    from unnest(string_to_array(setup, chr(10))) as entry
    where btrim(entry) <> ''
  );

alter table drill
  alter column setup set default '{}';

alter table drill
  alter column how_it_works drop default;

alter table drill
  alter column how_it_works type text[]
  using (
    select coalesce(array_agg(entry), '{}')
    from unnest(string_to_array(how_it_works, chr(10))) as entry
    where btrim(entry) <> ''
  );

alter table drill
  alter column how_it_works set default '{}';

alter table drill
  add constraint complete_fields_required check (
    is_draft or (
      duration_mins is not null
      and players_min is not null
      and coalesce(array_length(setup, 1), 0) > 0
      and coalesce(array_length(how_it_works, 1), 0) > 0
    )
  );
