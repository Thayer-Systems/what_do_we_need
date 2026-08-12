-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- Lets a project be assigned to a family member (used by the new /tasks page).
alter table sprinkles_projects
  add column if not exists member_id bigint references sprinkles_family_members(id) on delete set null;

-- Lets a calendar event repeat (used by the calendar event edit modal).
alter table sprinkles_events
  add column if not exists recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  add column if not exists recurrence_until date;
