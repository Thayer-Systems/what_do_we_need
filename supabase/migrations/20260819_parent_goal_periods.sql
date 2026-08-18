-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- Parents' Goals were too granular to represent something like "workout
-- 5x per week" — only a single running value/target. This adds a second
-- goal shape: a count that resets every day/week/month, tracked with a
-- quick "+1" log instead of manually editing a number.
alter table sprinkles_member_stats
  add column if not exists goal_type text not null default 'numeric' check (goal_type in ('numeric', 'count'));

alter table sprinkles_member_stats
  add column if not exists period text check (period in ('day', 'week', 'month'));

-- The start date of the period the current `value` count applies to — the
-- app treats value as reset (back to 0) once "now" has moved past this
-- period, without needing a cron job to zero it out.
alter table sprinkles_member_stats
  add column if not exists period_start date;

notify pgrst, 'reload schema';
