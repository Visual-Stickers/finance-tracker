-- Run this if you already have the tables from the original app.
-- Adds the one new column this rebuild needs, to tag expenses that were
-- auto-created from a loan EMI or credit card payment.

alter table public.month_expenses add column if not exists source text;

-- Double-check RLS is actually on (see schema.sql for the policy definitions
-- if any of these come back false):
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in ('months', 'month_expenses', 'loans', 'credit_cards', 'profiles');
