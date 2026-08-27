-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- Two crockpot recipes requested directly, added to the (uncategorized)
-- recipe library with full ingredients/instructions/tags/equipment.
--
-- ingredients/tags/equipment may be native text[] or jsonb depending on
-- when this project's recipes table was created (see
-- 20260816_recipe_library_folders.sql, which handles the same ambiguity) —
-- branch on the actual column type rather than assuming one.
do $$
declare
  ing_type text;
begin
  select data_type into ing_type from information_schema.columns
    where table_name = 'recipes' and column_name = 'ingredients';

  if ing_type = 'jsonb' then
    insert into recipes (name, ingredients, tags, equipment, est_time, notes)
    select v.name, to_jsonb(v.ingredients), to_jsonb(v.tags), to_jsonb(v.equipment), v.est_time, v.notes
    from (values
      (
        'Crockpot Chicken Spaghetti',
        array[
          '2 boneless, skinless chicken breasts',
          '2 (10 oz) cans cream of chicken soup',
          '1 (10 oz) can Rotel, do not drain',
          '8 oz shredded cheese, cheddar, Colby Jack, or mozzarella',
          '1/2 cup sour cream',
          '1 1/2 tsp garlic powder',
          '1 1/2 tsp paprika',
          '1 to 2 tsp salt, start with 1 tsp and adjust to taste',
          '1/2 tsp Italian seasoning',
          'Dash of black pepper',
          '1 (16 oz) box spaghetti, cooked and drained'
        ]::text[],
        array['Dinner', 'Crockpot']::text[],
        array['Crockpot']::text[],
        '6 hr',
        '1. Add the chicken breasts to the crockpot.
2. Pour in the cream of chicken soup and undrained Rotel.
3. Add garlic powder, paprika, salt, black pepper, and Italian seasoning.
4. Stir slightly so the chicken is covered with the sauce.
5. Cover and cook on LOW for 6 to 7 hours or HIGH for 4 to 5 hours, until the chicken is cooked through and shreds easily.
6. Remove the chicken, shred it with two forks, then return it to the crockpot.
7. Stir in the sour cream and shredded cheese until melted and creamy.
8. Cook the spaghetti according to the package directions and drain.
9. Add the cooked spaghetti to the crockpot and mix until evenly coated.
10. Taste, adjust seasoning if needed, and serve.'
      ),
      (
        'Crockpot Cheesy Broccoli Rice',
        array[
          'Nonstick cooking spray',
          '2 bags Knorr Cheddar Broccoli Rice',
          '2 large chicken breasts',
          '3 cups chicken broth',
          '1 cup cream of chicken soup',
          '3 tbsp minced garlic',
          'Salt and pepper to taste',
          'Italian seasoning to taste',
          '1 bag frozen broccoli florets',
          'Optional: 1 cup milk for extra creaminess',
          '1 to 2 cups shredded cheddar cheese'
        ]::text[],
        array['Dinner', 'Crockpot']::text[],
        array['Crockpot']::text[],
        '6 hr',
        '1. Coat the crockpot with nonstick cooking spray.
2. Add 2 bags of Knorr Cheddar Broccoli Rice.
3. Add the chicken breasts, chicken broth, cream of chicken soup, minced garlic, salt, pepper, and Italian seasoning.
4. Mix well.
5. Cover and cook on LOW for 4 to 6 hours.
6. During the last 30 minutes, add the frozen broccoli.
7. If you want it creamier, add 1 cup of milk.
8. Top with 1 to 2 cups shredded cheddar cheese.
9. Let the cheese melt, then serve.'
      )
    ) as v(name, ingredients, tags, equipment, est_time, notes)
    where not exists (select 1 from recipes r where r.name = v.name);
  else
    insert into recipes (name, ingredients, tags, equipment, est_time, notes)
    select v.name, v.ingredients, v.tags, v.equipment, v.est_time, v.notes
    from (values
      (
        'Crockpot Chicken Spaghetti',
        array[
          '2 boneless, skinless chicken breasts',
          '2 (10 oz) cans cream of chicken soup',
          '1 (10 oz) can Rotel, do not drain',
          '8 oz shredded cheese, cheddar, Colby Jack, or mozzarella',
          '1/2 cup sour cream',
          '1 1/2 tsp garlic powder',
          '1 1/2 tsp paprika',
          '1 to 2 tsp salt, start with 1 tsp and adjust to taste',
          '1/2 tsp Italian seasoning',
          'Dash of black pepper',
          '1 (16 oz) box spaghetti, cooked and drained'
        ]::text[],
        array['Dinner', 'Crockpot']::text[],
        array['Crockpot']::text[],
        '6 hr',
        '1. Add the chicken breasts to the crockpot.
2. Pour in the cream of chicken soup and undrained Rotel.
3. Add garlic powder, paprika, salt, black pepper, and Italian seasoning.
4. Stir slightly so the chicken is covered with the sauce.
5. Cover and cook on LOW for 6 to 7 hours or HIGH for 4 to 5 hours, until the chicken is cooked through and shreds easily.
6. Remove the chicken, shred it with two forks, then return it to the crockpot.
7. Stir in the sour cream and shredded cheese until melted and creamy.
8. Cook the spaghetti according to the package directions and drain.
9. Add the cooked spaghetti to the crockpot and mix until evenly coated.
10. Taste, adjust seasoning if needed, and serve.'
      ),
      (
        'Crockpot Cheesy Broccoli Rice',
        array[
          'Nonstick cooking spray',
          '2 bags Knorr Cheddar Broccoli Rice',
          '2 large chicken breasts',
          '3 cups chicken broth',
          '1 cup cream of chicken soup',
          '3 tbsp minced garlic',
          'Salt and pepper to taste',
          'Italian seasoning to taste',
          '1 bag frozen broccoli florets',
          'Optional: 1 cup milk for extra creaminess',
          '1 to 2 cups shredded cheddar cheese'
        ]::text[],
        array['Dinner', 'Crockpot']::text[],
        array['Crockpot']::text[],
        '6 hr',
        '1. Coat the crockpot with nonstick cooking spray.
2. Add 2 bags of Knorr Cheddar Broccoli Rice.
3. Add the chicken breasts, chicken broth, cream of chicken soup, minced garlic, salt, pepper, and Italian seasoning.
4. Mix well.
5. Cover and cook on LOW for 4 to 6 hours.
6. During the last 30 minutes, add the frozen broccoli.
7. If you want it creamier, add 1 cup of milk.
8. Top with 1 to 2 cups shredded cheddar cheese.
9. Let the cheese melt, then serve.'
      )
    ) as v(name, ingredients, tags, equipment, est_time, notes)
    where not exists (select 1 from recipes r where r.name = v.name);
  end if;
end $$;
