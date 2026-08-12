-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

create table if not exists sprinkles_push_subscriptions (
  id bigint generated always as identity primary key,
  member_id bigint references sprinkles_family_members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists sprinkles_push_subscriptions_member_id_idx
  on sprinkles_push_subscriptions (member_id);
