-- Phase 2, Task 10 fix round. Two independent fixes:
--
-- 1. save_reflection(): saveReflection previously ran one UPDATE per drill
--    plus a separate session UPDATE from the browser client — a partial
--    failure (e.g. drill 2 of 3 fails) left drill 1's rating persisted but
--    reflected_at never set, stranding the session in `reflect` with a form
--    that can no longer distinguish saved from unsaved entries. Wrapping the
--    whole write in one plpgsql function makes it commit or roll back as a
--    unit, called via supabase.rpc() instead of sequential client updates.
--
-- 2. drill_stats.avg_rating: 0004 gated times_used on "session date has
--    passed" but left avg_rating ungated, so a rating on a not-yet-past
--    session could contribute to the average while contributing 0 to the
--    count — "Used 0 times · avg 4.0". Re-created here with the identical
--    filter on both aggregates. 0004 itself is already applied and is left
--    untouched as an accurate record of what ran.

create or replace function save_reflection(
  p_session_id uuid,
  p_entries jsonb,
  p_session_notes text
) returns void
  language plpgsql
  set search_path = public
as $$
declare
  entry jsonb;
begin
  -- p_entries is a JSON array of {sessionDrillId, rating, note}. Each row is
  -- scoped to p_session_id as well as its own id, so a caller can't use this
  -- function to write into a session_drill row belonging to another session.
  for entry in select * from jsonb_array_elements(p_entries)
  loop
    update session_drill
    set
      rating = (entry ->> 'rating')::int,
      note = entry ->> 'note'
    where id = (entry ->> 'sessionDrillId')::uuid
      and session_id = p_session_id;
  end loop;

  update session
  set
    session_notes = p_session_notes,
    reflected_at = now()
  where id = p_session_id;
end;
$$;

create or replace view drill_stats with (security_invoker = true) as
  select
    d.id as drill_id,
    count(sd.id) filter (
      where s.date is not null and s.date < current_date
    )::int as times_used,
    avg(sd.rating) filter (
      where s.date is not null and s.date < current_date
    ) as avg_rating
  from drill d
  left join session_drill sd on sd.drill_id = d.id
  left join session s on s.id = sd.session_id
  group by d.id;
