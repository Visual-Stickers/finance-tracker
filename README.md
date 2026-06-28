# 💰 My Personal Finance Tracker

A lifetime personal finance tracker that stores all your data directly in this GitHub repository as `data.json`.

---

## 🚀 How to Set Up (Step by Step)

### Step 1 — Create a GitHub Repository
1. Go to [github.com](https://github.com) and sign in
2. Click the **+** button (top right) → **New repository**
3. Name it anything, e.g. `my-finances`
4. Set it to **Private** (recommended for your financial data)
5. Click **Create repository**

---

### Step 2 — Upload These Files
Upload both files to your new repository:
- `index.html`
- `README.md`

To upload: In your repo page, click **Add file** → **Upload files** → drag both files → click **Commit changes**

---

### Step 3 — Enable GitHub Pages
1. In your repo, go to **Settings** → **Pages** (left sidebar)
2. Under **Source**, select **Deploy from a branch**
3. Choose branch: **main**, folder: **/ (root)**
4. Click **Save**
5. Wait 1–2 minutes, then your site will be live at:
   `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

---

### Step 4 — Create a GitHub Token (to save data)
1. Go to GitHub → **Settings** (your profile, top right)
2. Scroll down → **Developer settings** (left sidebar)
3. **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token (classic)**
5. Give it a name like `finance-tracker`
6. Tick the **repo** checkbox (full control of repos)
7. Scroll down → **Generate token**
8. **Copy the token** — you won't see it again!

---

### Step 5 — First Login
1. Open your site URL
2. Enter any PIN you want (minimum 4 digits) — this becomes your password
3. Enter your GitHub details:
   - **Username**: your GitHub username
   - **Repository**: the repo name (e.g. `my-finances`)
   - **Token**: the token you just copied
   - **Currency**: ₹ or $ or € etc.
4. Click **Save & Connect**

---

## ✅ Features

- 💚 **Income** tracking
- ❤️ **Expense** tracking  
- 🟡 **Bills** tracking
- 💜 **Fees** tracking
- 🔵 **Savings** tracking
- 📊 **Dashboard** with monthly summary and charts
- 🔁 **Recurring** transaction flag
- 🔍 **Search and filter** by type, month, keyword
- 💾 **Saves to GitHub** — works on all your devices
- 🔒 **PIN login** protection
- ⬇️ **Export/Import** backup as JSON
- 📱 **Mobile friendly**

---

## 💡 Tips

- After adding transactions, always press **💾 Save** to sync to GitHub
- Your data is stored in `data.json` in this repo — you can see it anytime
- To use on another device: just open the same GitHub Pages URL and enter your PIN and token
- Take a backup download monthly from Settings → Export Backup

---

## 🔒 Privacy

- Your data is stored in **your own GitHub repo** — Anthropic/GitHub cannot access your financial data beyond normal repo access
- Keep the repo **Private** for maximum privacy
- Your PIN is stored locally in your browser (hashed)
- Your GitHub token is stored locally in your browser — never shared

---

*Built with plain HTML + CSS + JavaScript. No frameworks, no dependencies, no servers.*
