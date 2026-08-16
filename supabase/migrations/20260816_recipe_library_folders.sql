-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- Recipe library folders + weekly-rotation tagging, per the Recipe Library
-- spec: recipes can belong to one of the 4 weekly rotation folders (with a
-- day-of-week + week number), the alternative-meals pool, or the
-- standalone fall-winter folder.
alter table recipes
  add column if not exists folder text
    check (folder in ('week-1', 'week-2', 'week-3', 'week-4', 'alternative-meals', 'fall-winter')),
  add column if not exists day_of_week text
    check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  add column if not exists week_tag int
    check (week_tag between 1 and 4);

-- The seed rows below only set name/folder/day_of_week/week_tag. Give
-- ingredients/tags/equipment a type-appropriate empty default first so
-- they don't trip a NOT NULL constraint, regardless of whether those
-- columns are jsonb or native Postgres arrays.
do $$
declare
  col text;
  col_type text;
begin
  foreach col in array array['ingredients', 'tags', 'equipment'] loop
    select data_type into col_type from information_schema.columns
      where table_name = 'recipes' and column_name = col;
    if col_type = 'ARRAY' then
      execute format('alter table recipes alter column %I set default ''{}''::text[]', col);
    elsif col_type = 'jsonb' then
      execute format('alter table recipes alter column %I set default ''[]''::jsonb', col);
    end if;
  end loop;
end $$;

-- Seed data — idempotent: skips a row if a recipe with the same name
-- already exists in that folder.
insert into recipes (name, folder, day_of_week, week_tag)
select v.name, v.folder, v.day_of_week, v.week_tag
from (values
  -- Week 1
  ('Cheesy broccoli chicken rice casserole', 'week-1', 'Monday', 1),
  ('Ground beef tacos', 'week-1', 'Tuesday', 1),
  ('Hamburgers', 'week-1', 'Wednesday', 1),
  ('Hawaiian meatballs', 'week-1', 'Thursday', 1),
  ('Make your own pizza', 'week-1', 'Friday', 1),

  -- Week 2
  ('Boursin meatball and orzo casserole', 'week-2', 'Monday', 2),
  ('Chicken tacos', 'week-2', 'Tuesday', 2),
  ('Spaghetti', 'week-2', 'Wednesday', 2),
  ('Pulled pork sliders and baked beans', 'week-2', 'Thursday', 2),
  ('Italian chicken pasta', 'week-2', 'Friday', 2),

  -- Week 3
  ('Sloppy joes', 'week-3', 'Monday', 3),
  ('Butter chicken and rice', 'week-3', 'Tuesday', 3),
  ('Beef stroganoff', 'week-3', 'Wednesday', 3),
  ('Quesadillas', 'week-3', 'Thursday', 3),
  ('Baked tortellini', 'week-3', 'Friday', 3),

  -- Week 4
  ('Grilled chicken tenderloins and corn', 'week-4', 'Monday', 4),
  ('Breakfast for dinner', 'week-4', 'Tuesday', 4),
  ('Russian chicken and rice', 'week-4', 'Wednesday', 4),
  ('Enchilada casserole', 'week-4', 'Thursday', 4),
  ('Fish and asparagus', 'week-4', 'Friday', 4),

  -- Alternative meals (pool of 10)
  ('Shrimp scampi', 'alternative-meals', null, null),
  ('Ritz chicken and butter noodles', 'alternative-meals', null, null),
  ('Chicken fried rice', 'alternative-meals', null, null),
  ('Philly cheesesteaks', 'alternative-meals', null, null),
  ('Meatball subs', 'alternative-meals', null, null),
  ('Crockpot lasagna', 'alternative-meals', null, null),
  ('Chicken bacon ranch pasta', 'alternative-meals', null, null),
  ('Steak and potatoes', 'alternative-meals', null, null),
  ('French onion chicken orzo bake', 'alternative-meals', null, null),
  ('Teriyaki chicken and veggies', 'alternative-meals', null, null),

  -- Fall/winter meals
  ('Chili', 'fall-winter', null, null),
  ('Chicken noodle soup', 'fall-winter', null, null),
  ('Roast', 'fall-winter', null, null),
  ('Pork and sauerkraut', 'fall-winter', null, null),
  ('Taco soup', 'fall-winter', null, null),
  ('Hamburger pasta bake', 'fall-winter', null, null),
  ('White chicken chili', 'fall-winter', null, null),
  ('Tortilla soup', 'fall-winter', null, null),
  ('Chicken pot pie', 'fall-winter', null, null),
  ('Shepherd''s pie', 'fall-winter', null, null),
  ('Chicken and stuffing', 'fall-winter', null, null)
) as v(name, folder, day_of_week, week_tag)
where not exists (
  select 1 from recipes r where r.name = v.name and r.folder = v.folder
);
