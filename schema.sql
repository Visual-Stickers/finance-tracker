-- ═══════════════════════════════════════════════════════════
--  Finance Tracker — Supabase Schema
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
  loan_id   uuid references loans(id) on delete cascade,
  date      date not null,
  amount    numeric(12,2) not null,
  notes     text,
  created_at timestamptz default now()
);

-- ── Card Payments ────────────────────────────────────────────
create table card_payments (
  id      uuid primary key default gen_random_uuid(),
  card_id uuid references credit_cards(id) on delete cascade,
  date    date not null,
  amount  numeric(12,2) not null,
  notes   text,
  created_at timestamptz default now()
);

-- ── Enable public access (no auth for now) ───────────────────
alter table income         enable row level security;
alter table expenses       enable row level security;
alter table loans          enable row level security;
alter table credit_cards   enable row level security;
alter table loan_payments  enable row level security;
alter table card_payments  enable row level security;

create policy "public_all" on income         for all using (true) with check (true);
create policy "public_all" on expenses       for all using (true) with check (true);
create policy "public_all" on loans          for all using (true) with check (true);
create policy "public_all" on credit_cards   for all using (true) with check (true);
create policy "public_all" on loan_payments  for all using (true) with check (true);
create policy "public_all" on card_payments  for all using (true) with check (true);
