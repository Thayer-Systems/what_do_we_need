-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- Two labels from the original seed didn't match the reference chart
-- exactly (an OCR misread and a display-cost formatting tweak) — fix them
-- in place if they were already seeded.
update sprinkles_coin_rules set label = 'Feeding Lilo' where label = 'Feeding Lila';
update sprinkles_coin_rules set label = 'Cleaning toilets/duting' where label = 'Cleaning toilets/dusting';
update sprinkles_coin_rewards set label = 'Trip to dollar store/$5 below' where label = 'Trip to dollar store/5 below';

-- Re-seed everything from the reference chart in full, in case the coins
-- migration never fully completed — idempotent, skips any row whose label
-- already exists (including the corrected labels above).
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
  (2, 'Feeding Lilo', 13),
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
  (3, 'Cleaning toilets/duting', 32),
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

  (50, 'Trip to dollar store/$5 below', 60),
  (50, 'Lunch with a parent at school', 61),

  (65, 'Trip to Chuck E. Cheese', 70),
  (65, 'Sleepover at mimi''s/Gogo''s', 71)
) as v(coin_cost, label, sort_order)
where not exists (select 1 from sprinkles_coin_rewards r where r.label = v.label);
