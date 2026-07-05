# Finance Command Center — bug fixes + mobile nav

Same architecture as your original app: plain HTML/CSS/JS, no build step,
no npm, deploy exactly like before (push to GitHub, GitHub Pages serves the
files directly).

## What changed

**Bugs fixed**
1. **Yearly report income bug** — `reports.html`'s yearly view only summed the main salary (`m.income`), silently dropping every extra income source in the yearly total, chart, table, and CSV export — even though the monthly view had already been fixed for this. All four spots now use the new `Utils.plannedIncome()` / `Utils.actualIncome()` helpers in `assets/js/utils.js`, so this can't drift out of sync again.
2. **Loan EMI / credit card payments never appeared as expenses** — marking an EMI or card payment as paid only updated the `loans` / `credit_cards` table, so dashboard balance, reports, and CSV export never reflected that money leaving your account. New `DB.payLoanEmi()` and `DB.payCard()` in `assets/js/storage.js` now also write a paid `month_expenses` row (tagged `source: 'loan'` / `'credit_card'`) in the same operation. `loans.html` and `credit-cards.html` now call these instead of hand-rolling the math.
3. **Theme "cloud sync" was write-only** — the old code saved your theme choice to `profiles.theme` on every toggle but never read it back, so a second device always used its own local default. It also used `.update()`, which silently does nothing if you don't have a profile row yet. `assets/js/theme.js` now reads the saved value back on load and uses `.upsert()`.

**Enhancement**
- Real mobile bottom tab bar (`.bottom-nav`) on all 6 app pages, shown only under 768px width. The old horizontal top nav is hidden on mobile instead of scrolling sideways.

## Setup

1. Run `supabase/migration_add_source.sql` in your Supabase project's SQL editor (adds the one new column, checks RLS status on every table).
2. Push these files to your GitHub repo exactly like you did with the original app — no build step, no npm install needed.
3. Make sure **Settings → Pages → Source** is set to whichever mode you were using before (branch-based is fine here, since there's nothing to build).

That's it — same deploy process you already know.
