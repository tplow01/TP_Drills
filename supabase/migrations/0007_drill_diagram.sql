-- supabase/migrations/0007_drill_diagram.sql
-- The in-app pitch diagram editor. `elements` is the entire serialized
-- canvas — reopening a diagram for editing is just reading this back in, no
-- reconstruction logic needed beyond rendering (drill diagrams + structured
-- notes design, 2026-08-10). Several diagrams per drill; `position` orders
-- them, no drag-to-reorder in v1.

create table drill_diagram (
  id            uuid primary key default gen_random_uuid(),
  drill_id      uuid not null references drill(id) on delete cascade,
  position      int not null,
  title         text,
  pitch_preset  text not null,
  elements      jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint drill_diagram_position_non_negative check (position >= 0),
  constraint drill_diagram_pitch_preset_valid check (pitch_preset in ('full', 'half', 'grid'))
);

create index drill_diagram_drill_idx on drill_diagram (drill_id);

create trigger drill_diagram_updated_at
  before update on drill_diagram
  for each row execute function set_updated_at();

-- Same deliberate no-auth posture as drill and session (spec 12).
alter table drill_diagram enable row level security;

drop policy if exists drill_diagram_public_all on drill_diagram;
create policy drill_diagram_public_all on drill_diagram
  for all using (true) with check (true);
