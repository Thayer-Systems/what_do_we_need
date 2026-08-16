-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- Distinguish kid vs parent family members, used by the new Kids Goals
-- (coins) and Parents Goals pages. Defaults everyone to 'kid' — flip the
-- two adults over from Family list / a member's profile in the app.
alter table sprinkles_family_members
  add column if not exists role text not null default 'kid' check (role in ('kid', 'parent'));

-- Coin rules — the "COINS GIVEN FOR" / "COINS TAKEN FOR" reference chart.
create table if not exists sprinkles_coin_rules (
  id bigint generated always as identity primary key,
  delta int not null check (delta <> 0),
  label text not null,
  sort_order int not null default 0
);

-- Coin ledger — every +/- coin transaction for a kid, either from tapping
-- a rule or from the quick add/subtract widget.
create table if not exists sprinkles_coin_ledger (
  id bigint generated always as identity primary key,
  member_id bigint not null references sprinkles_family_members(id) on delete cascade,
  delta int not null,
  reason text,
  rule_id bigint references sprinkles_coin_rules(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Reward tiers a kid can redeem coins for once they've saved enough.
create table if not exists sprinkles_coin_rewards (
  id bigint generated always as identity primary key,
  coin_cost int not null check (coin_cost > 0),
  label text not null,
  sort_order int not null default 0
);

-- Public/private visibility for projects ("Tasks" tab shows public ones;
-- private ones only show on the assigned member's profile page).
alter table sprinkles_projects
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private'));

-- Seed coin rules — idempotent: skips a row if the same label already
-- exists.
insert into sprinkles_coin_rules (delta, label, sort_order)
select v.delta, v.label, v.sort_order
from (values
  (1, 'Plate/trash away without being reminded', 1),
  (1, 'Trying a new food without complaint', 2),
  (1, 'Listening the first time', 3),
  (1, 'In room/quiet until 7:30am', 4),
  (1, 'Shoes and coat put away', 5),
  (1, 'Backpack unloaded', 6),

  (2, 'Setting table', 10),
  (2, 'Putting laundry away', 11),
  (2, 'Doing the dishes', 12),
  (2, 'Feeding Lila', 13),
  (2, 'Completing homework', 14),
  (2, 'Cleaning up toys at end of the night', 15),
  (2, 'Being kind', 16),
  (2, 'Positive attitude', 17),
  (2, 'Good report from school', 18),
  (2, 'Being helpful', 19),
  (2, 'Waking up dry', 20),
  (2, 'Quiet when mom/dad are on the phone', 21),
  (2, 'Taking a good nap', 22),

  (3, 'Playing nicely by self/with sibling', 30),
  (3, 'Picking weeds', 31),
  (3, 'Cleaning toilets/dusting', 32),
  (3, 'Exceptional behavior', 33),
  (3, 'Purple day at school/fill up heart chart', 34),

  (-1, 'Throwing toys', 40),
  (-1, 'Arguing', 41),
  (-1, 'Interrupting', 42),
  (-1, 'Not obeying (each offense)', 43),
  (-1, 'Out of room at bedtime', 44),
  (-1, 'Not sharing', 45),
  (-1, 'Whining', 46),
  (-1, 'Not using manners', 47),
  (-1, 'Not being responsible', 48),

  (-2, 'Tantrums', 50),
  (-2, 'Breaking things on purpose', 51),
  (-2, 'Violence (hitting, biting, kicking, pinching)', 52),
  (-2, 'Potty talk', 53),
  (-2, 'Screaming/yelling', 54),

  (-3, 'Timeout', 60),
  (-3, 'Bad school report', 61),
  (-3, 'Lying', 62),
  (-3, 'Bad public behavior', 63)
) as v(delta, label, sort_order)
where not exists (select 1 from sprinkles_coin_rules r where r.label = v.label);

-- Seed reward tiers — idempotent: skips a row if the same label already
-- exists.
insert into sprinkles_coin_rewards (coin_cost, label, sort_order)
select v.coin_cost, v.label, v.sort_order
from (values
  (12, 'Piece of candy', 1),
  (12, '10 minute dance party', 2),
  (12, 'Lunchbox treat', 3),

  (15, 'Boardgame of choice', 10),
  (15, 'Extra book at bedtime', 11),
  (15, 'Compliment/hug from each family member', 12),

  (17, 'Choose TV show', 20),
  (17, 'Choose dinner/restaurant', 21),
  (17, 'Treat after dinner', 22),

  (20, 'Movie night', 30),
  (20, 'Stay up 15 extra minutes', 31),
  (20, 'Bake cookies', 32),

  (30, 'Playdate with a friend', 40),
  (30, 'Ice cream', 41),
  (30, 'Help mommy make dinner', 42),

  (40, 'Donuts with dad before school', 50),
  (40, 'Day off chores', 51),
  (40, '10 minutes extra screen time', 52),

  (50, 'Trip to dollar store/5 below', 60),
  (50, 'Lunch with a parent at school', 61),

  (65, 'Trip to Chuck E. Cheese', 70),
  (65, "Sleepover at mimi's/Gogo's", 71)
) as v(coin_cost, label, sort_order)
where not exists (select 1 from sprinkles_coin_rewards r where r.label = v.label);
