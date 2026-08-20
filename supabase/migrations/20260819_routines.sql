-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- Named, schedulable routines (e.g. "Weekday Morning", "Sunday Morning")
-- replacing the single hard-coded "morning routine" concept — each one has
-- its own days-of-week + start/end time cadence, and owns a set of per-kid
-- checklist items (sprinkles_morning_routine_items, extended below).
create table if not exists sprinkles_routines (
  id bigint generated always as identity primary key,
  name text not null,
  days int[] not null default '{}',
  start_time time not null default '06:45',
  end_time time not null default '08:30',
  sort_order int not null default 0,
  active boolean not null default true
);

alter table sprinkles_morning_routine_items
  add column if not exists routine_id bigint references sprinkles_routines(id) on delete cascade;

-- Backfill: give every existing item a home in a default routine that
-- carries the same days/hours the old single "Routines" display-schedule
-- setting used, so nothing already set up disappears.
insert into sprinkles_routines (name, days, start_time, end_time, sort_order)
select 'Morning Routine', array[1,2,3,4,5], '06:45', '08:30', 0
where not exists (select 1 from sprinkles_routines);

update sprinkles_morning_routine_items
set routine_id = (select id from sprinkles_routines order by id limit 1)
where routine_id is null;

alter table sprinkles_routines disable row level security;
grant select, insert, update, delete on sprinkles_routines to anon, authenticated;
grant select, insert, update, delete on sprinkles_morning_routine_items to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

notify pgrst, 'reload schema';
