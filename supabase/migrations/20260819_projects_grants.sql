-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- sprinkles_projects never got the RLS-disable + grants treatment the
-- other tables (coins, chores) got — this matches "I don't see projects
-- and when I update it doesn't save": reads may work through a default
-- policy while writes are silently rejected.
alter table sprinkles_projects disable row level security;
grant select, insert, update, delete on sprinkles_projects to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

notify pgrst, 'reload schema';
