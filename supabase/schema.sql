-- Finance Command Center — full schema reference.
-- Safe to run on a fresh Supabase project. If you already have these tables
-- from the old app, just run migration_add_source.sql instead.

create table if not exists public.months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,                 -- 'YYYY-MM'
  label text,
  income numeric default 0,
  income_actual numeric,
  income_status text default 'expected',   -- expected | received
  income_date date,
  income_note text,
  balance numeric default 0,
  created_at timestamptz default now(),
  unique (user_id, month_key)
);

create table if not exists public.month_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  name text not null,
  planned numeric default 0,
  actual numeric,
  status text default 'pending',           -- pending | paid | skipped | expected | received
  date date,
  note text,
  sort_order int default 0,
  is_income boolean default false,
  source text,                             -- null | 'loan' | 'credit_card' (set automatically)
  created_at timestamptz default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_ref text,
  name text not null,
  bank text,
  principal numeric default 0,
  net_disbursed numeric default 0,
  outstanding numeric default 0,
  emi numeric default 0,
  interest_rate numeric default 0,
  apr numeric,
  total_interest numeric,
  total_payable numeric,
  tenure int default 0,
  emis_paid int default 0,
  emis_remaining int default 0,
  start_date date,
  end_date date,
  emi_start_date date,
  emi_end_date date,
  repayment_mode text,
  processing_fee numeric,
  stamp_duty numeric,
  insurance numeric,
  bounce_charge numeric,
  payment_history jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank text,
  limit_amount numeric default 0,
  outstanding numeric default 0,
  due_date date,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'dark'
);

-- ── Row Level Security ──────────────────────────────────────────────────
-- Every table must scope rows to the signed-in user. Without this, the
-- public anon key would let any signed-in user read/write anyone's data.

alter table public.months enable row level security;
alter table public.month_expenses enable row level security;
alter table public.loans enable row level security;
alter table public.credit_cards enable row level security;
alter table public.profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'months' and policyname = 'months_owner') then
    create policy months_owner on public.months for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'month_expenses' and policyname = 'month_expenses_owner') then
    create policy month_expenses_owner on public.month_expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'loans' and policyname = 'loans_owner') then
    create policy loans_owner on public.loans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'credit_cards' and policyname = 'credit_cards_owner') then
    create policy credit_cards_owner on public.credit_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_owner') then
    create policy profiles_owner on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;
