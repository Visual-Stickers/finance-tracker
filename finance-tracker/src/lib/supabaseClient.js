import { createClient } from '@supabase/supabase-js';

// Configure these in a `.env` file (see `.env.example`) rather than committing
// real values, especially if this repo is public. The anon key is designed to
// be public, but it only stays safe with Row Level Security (RLS) enabled on
// every table (months, month_expenses, loans, credit_cards, profiles) scoping
// rows to `auth.uid() = user_id`.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
