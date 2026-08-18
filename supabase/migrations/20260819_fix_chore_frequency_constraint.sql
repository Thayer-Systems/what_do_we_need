-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- The app now saves chores/tasks with frequency = 'none' (the new "no
-- timeline" default) as well as the original 'daily' / 'custom'. If
-- sprinkles_chores.frequency has an old CHECK constraint that only allows
-- ('daily','custom'), every insert/update that sends 'none' — which is
-- most new tasks, and any edit that unchecks "Set a schedule" — gets
-- silently rejected by Postgres, which reads client-side as "didn't save".
-- This finds and drops any CHECK constraint on that column (regardless of
-- its name) and replaces it with one that allows 'none' too.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'sprinkles_chores'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%frequency%'
  loop
    execute format('alter table sprinkles_chores drop constraint %I', con.conname);
  end loop;
end $$;

alter table sprinkles_chores
  add constraint sprinkles_chores_frequency_check check (frequency in ('none', 'daily', 'custom'));
