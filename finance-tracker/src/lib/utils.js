const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Resolves a CSS custom property to its current computed value (theme-aware). */
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#8b949e';
}

export function currency(v) {
  if (v == null || isNaN(v)) return '₹0';
  return '₹' + fmt.format(Math.round(Number(v)));
}

export function shortDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function monthKey(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key) {
  if (!key) return '—';
  const [y, m] = key.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function nameFromEmail(email) {
  if (!email) return 'there';
  const local = email.split('@')[0];
  const name = local.split(/[._-]/)[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** 0-100 composite score: savings rate (40%), EMI/income (40%), CC utilization (20%). */
export function healthScore(savingsRate, emiToIncome, ccUtilization) {
  const s = Math.max(0, Math.min(100, savingsRate));
  const e = Math.max(0, Math.min(100, 100 - emiToIncome));
  const c = Math.max(0, Math.min(100, 100 - ccUtilization));
  return Math.round(s * 0.4 + e * 0.4 + c * 0.2);
}

export function scoreLabel(score) {
  if (score >= 80) return { label: 'Excellent', color: '#3fb950' };
  if (score >= 60) return { label: 'Good', color: '#58a6ff' };
  if (score >= 40) return { label: 'Fair', color: '#d29922' };
  return { label: 'Needs Work', color: '#f85149' };
}

export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return false;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h] == null ? '' : String(r[h]);
          return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}

export function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Sum of planned income for a month, including all extra income sources. */
export function plannedIncome(m) {
  return (m.income || 0) + m.extraIncomes.reduce((s, e) => s + (e.planned || 0), 0);
}

/** Sum of actually-received income for a month, including all extra income sources. */
export function actualIncome(m) {
  const salary = m.incomeStatus === 'received' ? Number(m.incomeActual || 0) : 0;
  const extra = m.extraIncomes.reduce((s, e) => s + (e.status === 'received' ? Number(e.actual || 0) : 0), 0);
  return salary + extra;
}

export function plannedExpense(m) {
  return m.expenses.reduce((s, e) => s + (e.planned || 0), 0);
}

export function actualExpense(m) {
  return m.expenses.reduce((s, e) => s + (e.status === 'paid' ? Number(e.actual || 0) : 0), 0);
}
