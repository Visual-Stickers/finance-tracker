// settings.js - Settings page

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Theme.init();
  document.getElementById('navDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  document.getElementById('userEmail').textContent = user.email;
  updateThemeButtons();
  checkSyncStatus();
  renderLoanInfo();
});

function updateThemeButtons() {
  const isDark = Theme.current() === 'dark';
  document.getElementById('theme-dark').classList.toggle('active', isDark);
  document.getElementById('theme-light').classList.toggle('active', !isDark);
}

async function setTheme(theme) {
  Theme.apply(theme);
  Theme.updateIcon();
  localStorage.setItem('fcc-theme', theme);
  updateThemeButtons();
  try { await Storage.saveSettings({ theme, currency: '₹' }); } catch(e) {}
  Utils.showToast(`${theme === 'dark' ? 'Dark' : 'Light'} mode enabled!`);
}

async function checkSyncStatus() {
  try {
    const user = await Auth.getUser();
    if (user) {
      document.getElementById('syncStatus').textContent = `Connected as ${user.email}`;
      document.getElementById('syncBadge').textContent = '✅ Synced';
      document.getElementById('syncBadge').className = 'card-badge badge-success';
    }
  } catch(e) {
    document.getElementById('syncStatus').textContent = 'Unable to connect to Supabase';
    document.getElementById('syncBadge').textContent = '❌ Offline';
    document.getElementById('syncBadge').className = 'card-badge badge-danger';
  }
}

async function sendPasswordReset() {
  const user = await Auth.getUser();
  if (!user) return;
  try {
    await Auth.resetPassword(user.email);
    Utils.showToast('Password reset email sent!');
  } catch(e) {
    Utils.showToast('Failed to send reset email', 'error');
  }
}

async function exportBackup() {
  try {
    const [months, loans, cards] = await Promise.all([
      Storage.getMonths(), Storage.getLoans(), Storage.getCreditCards()
    ]);
    const backup = { version: '1.1', exportedAt: new Date().toISOString(), months, loans, cards };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Utils.showToast('Backup exported!');
  } catch(e) {
    Utils.showToast('Export failed', 'error');
  }
}

async function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm('This will merge data from the backup. Continue?')) return;
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    Utils.showToast('Import feature coming soon!');
  } catch(e) {
    Utils.showToast('Invalid backup file', 'error');
  }
}

async function resetApp() {
  if (!confirm('⚠️ This will DELETE ALL your data permanently. Are you absolutely sure?')) return;
  if (!confirm('Last chance — this CANNOT be undone. Delete everything?')) return;
  try {
    const sb   = getSupabase();
    const user = await Auth.getUser();
    await Promise.all([
      sb.from('months').delete().eq('user_id', user.id),
      sb.from('month_expenses').delete().eq('user_id', user.id),
      sb.from('loans').delete().eq('user_id', user.id),
      sb.from('credit_cards').delete().eq('user_id', user.id),
    ]);
    Utils.showToast('All data deleted. Reloading...');
    setTimeout(() => window.location.href = 'index.html', 1500);
  } catch(e) {
    Utils.showToast('Reset failed', 'error');
  }
}

async function renderLoanInfo() {
  const loans = await Storage.getLoans();
  const el = document.getElementById('settingsLoanInfo');
  if (!loans.length) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">No loans in database</div>';
    return;
  }
  el.innerHTML = loans.map(l => `
    <div class="settings-row">
      <div>
        <div class="settings-label">${l.name}</div>
        <div class="settings-desc">${l.bank || '—'} · ${l.tenure || 0} months · ${l.interestRate || 0}% p.a.</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;color:var(--accent-red)">${Utils.currency(l.outstanding)}</div>
        <div style="font-size:12px;color:var(--text-muted)">outstanding</div>
      </div>
    </div>`).join('');
}
