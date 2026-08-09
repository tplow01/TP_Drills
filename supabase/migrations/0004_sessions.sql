-- Phase 2. Sessions, the drills in them, and the stats derived from both.
--
-- `team` is created here ONLY so session.team_id can be a real foreign key.
-- Nothing in Phase 2 creates or reads teams; the Teams UI is Phase 3.

create table team (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  library     library     not null,
  age_band    age_band,
  byga_url    text,
  created_at  timestamptz not null default now(),

  -- Goalkeeping teams have no age band (spec 5.3, 7.6).
  constraint team_age_band_outfield_only check (
    library = 'outfield' or age_band is null
  )
);

create table session (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid references team(id) on delete set null,
  name           text        not null,
  library        library     not null,
  date           date,
  start_time     time,
  location       text,
  target_minutes int         not null default 45,
  age_band       age_band,
  session_notes  text,
  -- Set when the coach finishes (or dismisses) reflection. Status is derived
  -- from date + drill count + this column; there is no status column and no
  -- "mark complete" button (spec 7.8, 10).
  reflected_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint target_minutes_positive check (target_minutes > 0),
  constraint session_age_band_outfield_only check (
    library = 'outfield' or age_band is null
  )
);

create table session_drill (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references session(id) on delete cascade,
  -- No cascade: drills are soft-deleted, so the row must survive and the
  -- session still resolves the drill, rendered as removed (spec 9).
  drill_id          uuid not null references drill(id),
  position          int  not null,
  -- Never mutates the drill's own duration_mins (spec 7.4).
  duration_override int,
  rating            int,
  note              text,

  constraint rating_range check (rating is null or rating between 1 and 5),
  constraint duration_override_positive check (
    duration_override is null or duration_override > 0
  ),
  constraint position_non_negative check (position >= 0),
  -- Deferrable: reordering swaps positions inside one transaction and would
  -- otherwise collide mid-update.
  constraint session_drill_position_unique unique (session_id, position)
    deferrable initially deferred
);

create index session_dated_idx on session (date) where date is not null;
create index session_drill_drill_idx on session_drill (drill_id);

create trigger session_updated_at
  before update on session
  for each row execute function set_updated_at();

-- Usage and rating, derived. Never a stored counter: spec 7.4 keeps completed
-- sessions fully editable, so any counter would drift (spec 10).
-- times_used counts appearances in sessions whose date has passed.
create view drill_stats with (security_invoker = true) as
  select
    d.id as drill_id,
    count(sd.id) filter (
      where s.date is not null and s.date < current_date
    )::int as times_used,
    avg(sd.rating) as avg_rating
  from drill d
  left join session_drill sd on sd.drill_id = d.id
  left join session s on s.id = sd.session_id
  group by d.id;

-- Same deliberate no-auth posture as drill (spec 12). Sessions, unlike drills,
-- MAY be hard-deleted: the never-delete invariant is about drills only.
alter table team enable row level security;
alter table session enable row level security;
alter table session_drill enable row level security;

drop policy if exists "public all teams" on team;
create policy "public all teams" on team
  for all using (true) with check (true);

drop policy if exists "public all sessions" on session;
create policy "public all sessions" on session
  for all using (true) with check (true);

drop policy if exists "public all session drills" on session_drill;
create policy "public all session drills" on session_drill
  for all using (true) with check (true);
