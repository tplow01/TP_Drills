-- Libraries and age bands ---------------------------------------------------
create type library as enum ('outfield', 'goalkeeping');

-- Age band is an enum so U12-U14 / U15+ can be added later with ALTER TYPE,
-- with no data migration. See spec 5.3.
create type age_band as enum ('U6-U8', 'U9-U11');

-- One enum for both taxonomies. A check constraint below keeps each library's
-- values separate; a single enum avoids a polymorphic column.
create type drill_type as enum (
  -- outfield
  'warm_up', 'passing', 'dribbling', 'shooting', 'finishing',
  'defending', 'possession_rondo', 'small_sided_game', 'fun_cooldown',
  -- goalkeeping
  'gk_warmup_handling', 'shot_stopping', 'footwork', 'distribution',
  'crosses', 'positioning', 'reactions', 'one_v_ones'
);

create table drill (
  id                uuid primary key default gen_random_uuid(),
  library           library      not null,
  name              text         not null,
  type              drill_type   not null,
  age_band          age_band,
  suitable_from     text,
  duration_mins     int,
  players_min       int,
  players_max       int,
  goals_needed      int          not null default 0,
  cones_needed      int          not null default 0,
  bibs_needed       bool         not null default false,
  image_url         text,
  setup             text         not null default '',
  how_it_works      text         not null default '',
  coaching_points   text[]       not null default '{}',
  progressions      text,
  source            text,
  tags              text[]       not null default '{}',
  is_draft          bool         not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now(),

  -- Each library may only use its own types.
  constraint type_matches_library check (
    (library = 'outfield' and type in (
      'warm_up','passing','dribbling','shooting','finishing',
      'defending','possession_rondo','small_sided_game','fun_cooldown'))
    or
    (library = 'goalkeeping' and type in (
      'gk_warmup_handling','shot_stopping','footwork','distribution',
      'crosses','positioning','reactions','one_v_ones'))
  ),

  -- Goalkeeping never carries an age band. Outfield always does, unless it is
  -- still a draft. Drafts are explicitly allowed to be incomplete (spec 7.2).
  constraint age_band_rules check (
    (library = 'goalkeeping' and age_band is null)
    or
    (library = 'outfield' and (is_draft or age_band is not null))
  ),

  -- suitable_from is goalkeeping-only free text.
  constraint suitable_from_gk_only check (
    library = 'goalkeeping' or suitable_from is null
  ),

  -- The one opinionated constraint: a finished drill has coaching points.
  constraint coaching_points_required check (
    is_draft or coalesce(array_length(coaching_points, 1), 0) >= 1
  ),

  -- Finished drills carry their required fields.
  constraint complete_fields_required check (
    is_draft or (
      duration_mins is not null
      and players_min is not null
      and length(btrim(setup)) > 0
      and length(btrim(how_it_works)) > 0
    )
  ),

  constraint players_range_sane check (
    players_max is null or players_min is null or players_max >= players_min
  ),

  constraint positive_numbers check (
    coalesce(duration_mins, 1) > 0
    and coalesce(players_min, 1) > 0
    and goals_needed >= 0
    and cones_needed >= 0
  )
);

-- The library list is always "this library, not deleted".
create index drill_library_live_idx on drill (library) where deleted_at is null;

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger drill_updated_at
  before update on drill
  for each row execute function set_updated_at();

-- Image storage. Public read: the app has no auth, and image URLs are already
-- as exposed as the app itself (spec 12).
insert into storage.buckets (id, name, public)
values ('drill-images', 'drill-images', true)
on conflict (id) do nothing;

create policy "public read drill images" on storage.objects
  for select using (bucket_id = 'drill-images');

create policy "public write drill images" on storage.objects
  for insert with check (bucket_id = 'drill-images');

create policy "public delete drill images" on storage.objects
  for delete using (bucket_id = 'drill-images');
