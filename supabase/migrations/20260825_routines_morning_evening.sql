-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- Routines Reset: each routine is now tagged Morning or Evening (sun/moon
-- on the Routines page) instead of a free-form named routine with a time
-- window — the days array (unchanged) still lets one routine cover
-- multiple days at once (e.g. one "Morning" routine for Mon-Fri).
alter table sprinkles_routines
  add column if not exists period text not null default 'morning' check (period in ('morning', 'evening'));

-- Best-effort backfill for existing rows: a routine whose window starts at
-- or after noon is treated as an Evening routine, everything else Morning.
update sprinkles_routines
set period = case when start_time >= '12:00' then 'evening' else 'morning' end
where period is null;

-- Per-kid, per-day checklist completion — which items are checked off for
-- a given routine on a given date, and whether the all-or-none 3-coin
-- reward has already been paid out (so re-checking/unchecking later the
-- same day, or the routine coming back next week, doesn't double-pay).
create table if not exists sprinkles_routine_completions (
  id bigint generated always as identity primary key,
  routine_id bigint not null references sprinkles_routines(id) on delete cascade,
  member_id bigint not null references sprinkles_family_members(id) on delete cascade,
  date date not null,
  checked_item_ids bigint[] not null default '{}',
  coins_awarded boolean not null default false,
  unique (routine_id, member_id, date)
);

alter table sprinkles_routine_completions disable row level security;
grant select, insert, update, delete on sprinkles_routine_completions to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

notify pgrst, 'reload schema';
