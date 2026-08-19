-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- A picture next to each routine checklist item so younger kids who can't
-- read yet can still follow along.
alter table sprinkles_morning_routine_items
  add column if not exists icon text;

notify pgrst, 'reload schema';
