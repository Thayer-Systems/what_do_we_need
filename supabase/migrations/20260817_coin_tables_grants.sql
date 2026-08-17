-- Run this manually in the Supabase SQL editor for the mr_sprinkles_os
-- project — this session doesn't have access to that project, so it
-- can't be applied automatically. Safe to run more than once.

-- If these tables were created with row level security on and no policies
-- (a common default), reads can still work while writes get silently
-- rejected — which matches "the totals don't update when I add coins".
-- Disable RLS on them to match how the rest of this project's tables are
-- already set up, and make sure the app's anon key can read and write.
alter table sprinkles_coin_rules disable row level security;
alter table sprinkles_coin_ledger disable row level security;
alter table sprinkles_coin_rewards disable row level security;

grant select, insert, update, delete on sprinkles_coin_rules to anon, authenticated;
grant select, insert, update, delete on sprinkles_coin_ledger to anon, authenticated;
grant select, insert, update, delete on sprinkles_coin_rewards to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
