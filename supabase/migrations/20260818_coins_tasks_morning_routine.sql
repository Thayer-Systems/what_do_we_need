-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- ─── Coins: re-apply the write-access repair ────────────────────────────
-- Kids' coin adjustments were still silently failing to save after the
-- previous grants migration — re-running this (RLS off + explicit grants +
-- a schema-cache reload) covers the case where that migration either never
-- ran, or PostgREST's cached schema is stale.
alter table sprinkles_coin_rules disable row level security;
alter table sprinkles_coin_ledger disable row level security;
alter table sprinkles_coin_rewards disable row level security;

grant select, insert, update, delete on sprinkles_coin_rules to anon, authenticated;
grant select, insert, update, delete on sprinkles_coin_ledger to anon, authenticated;
grant select, insert, update, delete on sprinkles_coin_rewards to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

notify pgrst, 'reload schema';

-- ─── Tasks: private/public + optional schedule/due date ────────────────
-- Public tasks show on the Today board; private ones only show on the
-- assigned member's profile. New tasks default to no timeline (frequency
-- 'none') — a schedule (days) and/or a due date are both optional add-ons
-- rather than a forced choice.
alter table sprinkles_chores
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private'));

alter table sprinkles_chores
  add column if not exists due_date date;

alter table sprinkles_chores
  alter column frequency set default 'none';

-- ─── School Day: per-kid recurring morning routine ──────────────────────
-- Set once on a kid's profile, these repeat every applicable school
-- morning without needing to be re-created.
create table if not exists sprinkles_morning_routine_items (
  id bigint generated always as identity primary key,
  member_id bigint not null references sprinkles_family_members(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

alter table sprinkles_morning_routine_items disable row level security;
grant select, insert, update, delete on sprinkles_morning_routine_items to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

notify pgrst, 'reload schema';
