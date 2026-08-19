-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- There's no icon-picker UI in the app (family members are managed
-- directly in this table), so wiring up the new mermaid/fox/cat art means
-- updating the `icon` column by name here.
update sprinkles_family_members set icon = 'mermaid' where name = 'Piper';
update sprinkles_family_members set icon = 'fox' where name = 'Levi';
update sprinkles_family_members set icon = 'cat' where name = 'Silas';
