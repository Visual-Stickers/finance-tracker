// utils.js
const Utils = (() => {
  const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

  function currency(v) {
    if (v == null || isNaN(v)) return '₹0';
    return '₹' + fmt.format(Math.round(Number(v)));
  }

  function shortDate(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  }

  function monthKey(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  function monthLabel(key) {
    if (!key) return '—';
    const [y, m] = key.split('-');
    return new Date(+y, +m-1, 1).toLocaleDateString('en-IN', { month:'short', year:'numeric' });
  }

  function toast(msg, type='success') {
    let t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast show ${type}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast'; }, 3000);
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  // Notify other tabs that data has changed
  function notifyDataChanged() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('finance_tracker_data');
        bc.postMessage({ type: 'data_changed', ts: Date.now() });
        bc.close();
      }
      localStorage.setItem('_finance_tracker_sync', Date.now().toString());
    } catch(e) {}
  }

  // Export data as CSV
  function exportToCSV(filename, rows) {
    if (!rows || !rows.length) { toast('No data to export', 'error'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = r[h] == null ? '' : String(r[h]);
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Export downloaded!');
  }

  // Financial health score (0-100)
  function healthScore(savingsRate, emiToIncome, ccUtilization) {
    const s = Math.max(0, Math.min(100, savingsRate));        // higher = better
    const e = Math.max(0, Math.min(100, 100 - emiToIncome)); // lower EMI ratio = better
    const c = Math.max(0, Math.min(100, 100 - ccUtilization)); // lower CC util = better
    return Math.round(s * 0.4 + e * 0.4 + c * 0.2);
  }

  function scoreLabel(score) {
    if (score >= 80) return { label: 'Excellent', color: '#3fb950' };
    if (score >= 60) return { label: 'Good',      color: '#58a6ff' };
    if (score >= 40) return { label: 'Fair',       color: '#d29922' };
    return                  { label: 'Needs Work', color: '#f85149' };
  }

  // Get first name from email
  function nameFromEmail(email) {
    if (!email) return 'there';
    const local = email.split('@')[0];
    const name  = local.split(/[._-]/)[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // ── Shared income/expense math ──────────────────────────────────────────
  // IMPORTANT: every page (dashboard, income-expense, reports monthly AND
  // yearly) must use these same four functions rather than re-deriving the
  // totals locally. The old yearly report bug happened precisely because
  // this calculation was copy-pasted in several places and only some copies
  // got updated to include extra income sources.
  function plannedIncome(m) {
    return (m.income || 0) + (m.extraIncomes || []).reduce((s, e) => s + (e.planned || 0), 0);
  }
  function actualIncome(m) {
    const salary = m.incomeStatus === 'received' ? Number(m.incomeActual || 0) : 0;
    const extra = (m.extraIncomes || []).reduce((s, e) => s + (e.status === 'received' ? Number(e.actual || 0) : 0), 0);
    return salary + extra;
  }
  function plannedExpense(m) {
    return (m.expenses || []).reduce((s, e) => s + (e.planned || 0), 0);
  }
  function actualExpense(m) {
    return (m.expenses || []).reduce((s, e) => s + (e.status === 'paid' ? Number(e.actual || 0) : 0), 0);
  }

  return { currency, shortDate, monthKey, monthLabel, toast, openModal, closeModal, notifyDataChanged, exportToCSV, healthScore, scoreLabel, nameFromEmail, plannedIncome, actualIncome, plannedExpense, actualExpense };
})();
