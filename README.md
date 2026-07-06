# Finance Tracker 💰

Personal finance tracker — Income · Expenses · Loans · Credit Cards · Reports  
Built with vanilla HTML/CSS/JS + Supabase. No frameworks. No build step.

**Live site:** https://YOUR_USERNAME.github.io/finance-tracker/

---

## Step 1 — Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `finance-tracker`
3. Set to **Public**
4. Do NOT tick "Add README" (we already have one)
5. Click **Create repository**

---

## Step 2 — Upload Files

### Option A — Drag & Drop (easiest, no terminal needed)

1. Open your new repo on GitHub
2. Click **uploading an existing file** (link on the empty repo page)
3. Drag ALL files and folders from this zip into the upload area:
   - `index.html`
   - `income.html`
   - `expenses.html`
   - `loans.html`
   - `cards.html`
   - `reports.html`
   - `404.html`
   - `.nojekyll`
   - `schema.sql`
   - `README.md`
   - `css/` folder (with `style.css` inside)
   - `js/` folder (with `config.js`, `utils.js`, `nav.js` inside)
4. Scroll down → click **Commit changes**

### Option B — Git Terminal

```bash
cd finance-tracker          # the unzipped folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/finance-tracker.git
git push -u origin main
```

---

## Step 3 — Enable GitHub Pages

1. In your GitHub repo → click **Settings** (top menu)
2. Left sidebar → **Pages**
3. Under "Branch" → select **main** → folder **/ (root)**
4. Click **Save**
5. Wait ~60 seconds → refresh the page
6. Your site is live at: `https://YOUR_USERNAME.github.io/finance-tracker/`

---

## Step 4 — Run the Database Schema

1. Go to https://supabase.com → your project → **SQL Editor**
2. Paste the contents of `schema.sql` → click **Run**
3. Done — all 6 tables created

---

## Pages

| Page | URL |
|------|-----|
| Dashboard | `/index.html` |
| Income | `/income.html` |
| Expenses | `/expenses.html` |
| Loans | `/loans.html` |
| Credit Cards | `/cards.html` |
| Reports | `/reports.html` |

---

## Bulk Import Format

**Income** and **Expenses** pages have a Bulk Import button.  
Paste one row per line:

```
YYYY-MM-DD, Amount, Category, Description, Notes
2026-07-01, 50000, Salary, July salary
2026-07-05, 12000, Rent, July rent
2026-07-06, 25184, Loan EMI, HDFC personal loan
2026-07-10, 4000, Family, Amma
```

---

## File Structure

```
finance-tracker/
├── index.html        Dashboard
├── income.html       Income (+ bulk import)
├── expenses.html     Expenses (+ bulk import)
├── loans.html        Loan management + EMI tracking
├── cards.html        Credit card management
├── reports.html      Reports: Daily / Monthly / Yearly / Custom
├── 404.html          GitHub Pages fallback
├── .nojekyll         Disables Jekyll (required for GitHub Pages)
├── schema.sql        Run once in Supabase SQL Editor
├── css/
│   └── style.css     All styles
└── js/
    ├── config.js     Supabase credentials + REST client
    ├── utils.js      Shared helpers
    └── nav.js        Sidebar navigation
```
