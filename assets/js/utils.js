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

  return { currency, shortDate, monthKey, monthLabel, toast, openModal, closeModal };
})();
