-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- Singleton config for the "Routines" page (Tools > Routines): which days
-- and time window the School Day display auto-becomes the TV's main
-- screen, and which content blocks it shows. Persists until changed —
-- there's no cron job involved, the app just checks this on a timer.
create table if not exists sprinkles_display_schedule (
  id bigint primary key default 1,
  days int[] not null default '{1,2,3,4,5}',
  start_time text not null default '06:45',
  end_time text not null default '08:30',
  show_weather boolean not null default true,
  show_routines boolean not null default true,
  show_schedule boolean not null default false,
  show_coins boolean not null default false,
  enabled boolean not null default true,
  constraint sprinkles_display_schedule_singleton check (id = 1)
);

insert into sprinkles_display_schedule (id)
values (1)
on conflict (id) do nothing;

alter table sprinkles_display_schedule disable row level security;
grant select, insert, update, delete on sprinkles_display_schedule to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

notify pgrst, 'reload schema';
