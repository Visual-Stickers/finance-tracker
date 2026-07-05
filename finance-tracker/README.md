# Finance Command Center (v3 — full rebuild)

A personal finance tracker: monthly income/expense planning, loans, credit
cards, reports, and a health score. Built with **React + Vite + Tailwind**,
data stored in **Supabase**.

## What changed from the old static-HTML version

**Architecture**
- Old: 7 separate HTML pages, each with duplicated inline `<script>` logic and hand-written DOM updates.
- New: single-page app, React Router, one data layer (`src/lib/api.js`), shared components, Tailwind design system, Vite build/bundling, GitHub Actions CI deploy.

**Bugs fixed**
1. **Yearly report income bug** — the yearly view only summed the main salary (`m.income`) and silently dropped every extra income source, even though the monthly view had already been fixed for this. Root cause: the same calculation was duplicated in four places and only some copies got fixed. Now every page imports the same `plannedIncome()` / `actualIncome()` helpers from `src/lib/utils.js`, so it can't drift out of sync again.
2. **Loan EMI / credit card payments never appeared as expenses** — marking an EMI or card payment as paid only updated the `loans` / `credit_cards` table. Dashboard balance, reports, and CSV export never reflected that money leaving your account. `payLoanEmi()` and `payCard()` in `api.js` now also write a `month_expenses` row (tagged `source: 'loan'` / `'credit_card'`) in the same operation.
3. **Theme "cloud sync" was write-only** — the old code saved your theme to `profiles.theme` but never read it back, so a second device always used its own local default. `ThemeContext.jsx` now pulls the saved value on login.
4. Dead code (`getSettings`) removed.

**Enhancement**
- Mobile experience: a real bottom tab bar navigation on phones (previous version only had a horizontally-scrolling desktop nav bar), responsive card grids, larger tap targets, sticky top bar.

## Local setup

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

## Database setup

- **Brand new Supabase project:** run `supabase/schema.sql` in the SQL editor.
- **Already using the old app's database:** just run `supabase/migration_add_source.sql` — it adds the one new column this rebuild needs and reports whether Row Level Security is actually enabled on each table. If any table shows `rls_enabled = false`, open `schema.sql` and run the RLS block for that table — without it, the public anon key does not protect other users' data.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In **Settings → Pages**, set source to "GitHub Actions".
3. In **Settings → Secrets and variables → Actions**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Push to `main` — `.github/workflows/deploy.yml` builds and deploys automatically. It assumes you're deploying to `https://<user>.github.io/<repo>/`; if this repo *is* your `<user>.github.io` repo (i.e. deploying to the root), delete the `VITE_BASE_PATH` line in the workflow so it defaults to `/`.

Prefer Netlify/Vercel instead? Just connect the repo, set the build command to `npm run build`, output directory `dist`, and add the same two environment variables in their dashboard — you can ignore the GitHub Actions workflow entirely.

## Project structure

```
src/
  lib/            data layer, auth, theme, toast, utils (no UI)
  components/     shared UI: Layout (nav), Modal, MonthNav, ProtectedRoute
  pages/          one file per route
supabase/         SQL schema + migration
.github/workflows deploy.yml — CI build & deploy
```

## Known follow-ups not included in this pass

- Recurring expense templates, budgets per category, due-date notifications, multi-currency — deferred per your priority call (mobile experience first).
- No automated tests yet.
- EMI amortization in `payLoanEmi` assumes a standard reducing-balance schedule; if you've been paying irregular amounts, outstanding balance may drift from your bank statement — you can always overwrite "Current Outstanding" directly on the loan's Edit form to resync.
