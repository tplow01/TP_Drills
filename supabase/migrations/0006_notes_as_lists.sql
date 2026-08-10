-- supabase/migrations/0006_notes_as_lists.sql
-- Setup and How it works become repeating bullet-point lists, matching
-- coaching_points, instead of single free-text paragraphs (drill diagrams +
-- structured notes design, 2026-08-10). Existing text is split on newlines,
-- blank lines dropped — nothing is lost, just reshaped.

alter table drill
  alter column setup type text[]
  using (
    select coalesce(array_agg(line), '{}')
    from unnest(string_to_array(setup, chr(10))) as line
    where btrim(line) <> ''
  ),
  alter column setup set default '{}';

alter table drill
  alter column how_it_works type text[]
  using (
    select coalesce(array_agg(line), '{}')
    from unnest(string_to_array(how_it_works, chr(10))) as line
    where btrim(line) <> ''
  ),
  alter column how_it_works set default '{}';
