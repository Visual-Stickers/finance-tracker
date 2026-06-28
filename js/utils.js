// utils.js - Shared utilities

const Utils = (() => {
  const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

  function currency(val) {
    if (val == null || isNaN(val)) return '₹0';
    return '₹' + fmt.format(Math.round(val));
  }

  function pct(val) {
    return (val * 100).toFixed(1) + '%';
  }

  function shortDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function monthKey(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthLabel(key) {
    const [y, m] = key.split('-');
    const d = new Date(+y, +m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  function daysUntil(dateStr) {
    const now = new Date();
    const then = new Date(dateStr);
    return Math.ceil((then - now) / (1000 * 60 * 60 * 24));
  }

  function classFor(status) {
    return { received: 'success', paid: 'success', pending: 'warning',
             expected: 'info', skipped: 'muted' }[status] || 'muted';
  }

  function iconFor(status) {
    return { received: 'fa-check-circle', paid: 'fa-check-circle',
             pending: 'fa-clock', expected: 'fa-hourglass-half',
             skipped: 'fa-times-circle' }[status] || 'fa-circle';
  }

  function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast show ${type}`;
    setTimeout(() => t.className = 'toast', 3000);
  }

  function openModal(id) { document.getElementById(id)?.classList.add('active'); }
  function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

  return { currency, pct, shortDate, monthKey, monthLabel, daysUntil,
           classFor, iconFor, showToast, openModal, closeModal };
})();
