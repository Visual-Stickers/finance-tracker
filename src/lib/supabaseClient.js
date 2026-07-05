import { createClient } from '@supabase/supabase-js';

// Configure these in a `.env` file (see `.env.example`) rather than committing
// real values, especially if this repo is public. The anon key is designed to
// be public, but it only stays safe with Row Level Security (RLS) enabled on
// every table (months, month_expenses, loans, credit_cards, profiles) scoping
// rows to `auth.uid() = user_id`.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError =
  !SUPABASE_URL || !SUPABASE_ANON_KEY
    ? 'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. If this is the live site, add both as GitHub repository secrets (Settings → Secrets and variables → Actions) and re-run the deploy workflow. Locally, copy .env.example to .env and fill in your Supabase project values.'
    : null;

if (supabaseConfigError) {
  // eslint-disable-next-line no-console
  console.error(supabaseConfigError);
}

// createClient() throws synchronously on a malformed/missing URL, which
// previously crashed the whole module graph on import and produced a blank
// white page with no on-screen explanation. Fall back to a dummy client so
// the app can still render and show `supabaseConfigError` to the user.
export const supabase = supabaseConfigError
  ? createClient('https://placeholder.supabase.co', 'placeholder-key')
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
