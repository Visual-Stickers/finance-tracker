-- Run this once in Supabase → SQL Editor.
-- Adds the one new column this update needs, to tag expenses that were
-- auto-created from a loan EMI or credit card payment.

alter table public.month_expenses add column if not exists source text;

-- Double-check RLS is actually on for every table — without it, the public
-- anon key would let any signed-in user read/write anyone else's data.
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in ('months', 'month_expenses', 'loans', 'credit_cards', 'profiles');

-- If any table above shows rls_enabled = false, run this for that table
-- (swap <table> for the real name), then add an owner policy:
--   alter table public.<table> enable row level security;
--   create policy <table>_owner on public.<table>
--     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (for `profiles`, the column is `id` instead of `user_id`)
