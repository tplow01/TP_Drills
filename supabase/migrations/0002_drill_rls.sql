-- The app has no auth by design (spec 12): every reader and writer of the
-- `drill` table is the anon role. These policies are deliberately wide open
-- to match that posture -- the same reasoning already applied to the
-- storage.objects policies for the drill-images bucket in 0001_drills.sql.
-- This is not an oversight; do not narrow it without revisiting spec 12.

alter table drill enable row level security;

drop policy if exists "public read drills" on drill;
create policy "public read drills" on drill
  for select using (true);

drop policy if exists "public insert drills" on drill;
create policy "public insert drills" on drill
  for insert with check (true);

drop policy if exists "public update drills" on drill;
create policy "public update drills" on drill
  for update using (true) with check (true);

drop policy if exists "public delete drills" on drill;
create policy "public delete drills" on drill
  for delete using (true);
