-- ═══════════════════════════════════════════════════════════
--  Finance Tracker — Supabase Schema (with auth)
--  Run this ONCE in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Drop existing tables (clean slate)
drop table if exists card_payments cascade;
drop table if exists loan_payments cascade;
drop table if exists credit_cards cascade;
drop table if exists loans cascade;
drop table if exists expenses cascade;
drop table if exists income cascade;

-- ── Income ───────────────────────────────────────────────────
create table income (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  category    text not null default 'Salary',
  description text,
  amount      numeric(12,2) not null,
  notes       text,
  created_at  timestamptz default now()
);

-- ── Expenses ─────────────────────────────────────────────────
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  category    text not null,
  description text,
  amount      numeric(12,2) not null,
  notes       text,
  created_at  timestamptz default now()
);

-- ── Loans ────────────────────────────────────────────────────
create table loans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  bank              text,
  principal         numeric(14,2) not null,
  outstanding       numeric(14,2) not null,
  emi               numeric(10,2) not null,
  interest_rate     numeric(5,2),
  tenure_months     int,
  emis_paid         int default 0,
  start_date        date,
  end_date          date,
  next_emi_date     date,
  notes             text,
  created_at        timestamptz default now()
);

-- ── Credit Cards ─────────────────────────────────────────────
create table credit_cards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  bank            text,
  credit_limit    numeric(12,2) not null default 0,
  outstanding     numeric(12,2) not null default 0,
  statement_day   int,
  due_day         int,
  min_due         numeric(10,2) default 0,
  notes           text,
  created_at      timestamptz default now()
);

-- ── Loan Payments ────────────────────────────────────────────
create table loan_payments (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  loan_id   uuid references loans(id) on delete cascade,
  date      date not null,
  amount    numeric(12,2) not null,
  notes     text,
  created_at timestamptz default now()
);

-- ── Card Payments ────────────────────────────────────────────
create table card_payments (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid references credit_cards(id) on delete cascade,
  date    date not null,
  amount  numeric(12,2) not null,
  notes   text,
  created_at timestamptz default now()
);

-- ── Auto-fill user_id on insert ──────────────────────────────
-- The app's insert calls don't (and shouldn't) send user_id themselves —
-- this trigger stamps every new row with whoever is currently signed in,
-- so there's no way for the client to accidentally write into someone
-- else's account even if it tried.
create or replace function set_user_id()
returns trigger as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_user_id_income         before insert on income         for each row execute function set_user_id();
create trigger trg_user_id_expenses       before insert on expenses       for each row execute function set_user_id();
create trigger trg_user_id_loans          before insert on loans          for each row execute function set_user_id();
create trigger trg_user_id_credit_cards   before insert on credit_cards   for each row execute function set_user_id();
create trigger trg_user_id_loan_payments  before insert on loan_payments  for each row execute function set_user_id();
create trigger trg_user_id_card_payments  before insert on card_payments  for each row execute function set_user_id();

-- ── Row Level Security ───────────────────────────────────────
-- FIX: the old policies used `using (true)` — meaning anyone holding this
-- project's public anon key (which is visible in the browser's JS, by
-- design) could read or write every user's financial data with no login
-- at all. These policies now scope every row to whoever is signed in.
alter table income         enable row level security;
alter table expenses       enable row level security;
alter table loans          enable row level security;
alter table credit_cards   enable row level security;
alter table loan_payments  enable row level security;
alter table card_payments  enable row level security;

create policy "owner_all" on income         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on expenses       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on loans          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on credit_cards   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on loan_payments  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on card_payments  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
