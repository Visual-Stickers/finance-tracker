// ─── Shared Utilities ─────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

const U = {
  // Currency
  inr(v) { return '₹' + fmt.format(Math.round(+v || 0)); },
  // Plain-text currency for jsPDF: the standard PDF fonts (helvetica etc.)
  // don't include the ₹ glyph, so jsPDF silently falls back to an unrelated
  // character (renders as "1"). Use "Rs." instead for anything drawn into a PDF.
  inrPdf(v) { return 'Rs. ' + fmt.format(Math.round(+v || 0)); },

  // Date helpers
  today()     { return new Date().toISOString().split('T')[0]; },
  monthStart(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; },
  monthEnd(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0];
  },
  yearStart(d = new Date()) { return `${d.getFullYear()}-01-01`; },
  yearEnd(d  = new Date()) { return `${d.getFullYear()}-12-31`; },
  fmtDate(s) {
    if (!s) return '—';
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  },
  monthLabel(s) {
    if (!s) return '';
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { month:'short', year:'numeric' });
  },

  // Toast
  toast(msg, type = 'success') {
    let el = document.getElementById('_toast');
    if (!el) {
      el = document.createElement('div');
      el.id = '_toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = `toast toast--${type} toast--show`;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.className = 'toast', 2800);
  },

  // Modal helpers
  openModal(id)  { document.getElementById(id)?.classList.add('open'); },
  closeModal(id) { document.getElementById(id)?.classList.remove('open'); },

  // Loading state on button
  loading(btn, on) {
    if (on) { btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true; }
    else     { btn.innerHTML = btn.dataset.orig || btn.innerHTML; btn.disabled = false; }
  },

  // Confirm dialog
  async confirm(msg) {
    return window.confirm(msg);
  },

  // Truncate
  trunc(s, n=32) { return s?.length > n ? s.slice(0,n)+'…' : (s||''); },

  // Active nav
  setNav() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === page);
    });
  },

  // Format date for input[type=date]
  isoDate(s) { return s ? s.split('T')[0] : ''; },
};

// ─── Global error boundary ────────────────────────────────────────────────────
window.addEventListener('unhandledrejection', e => {
  console.error(e.reason);
  U.toast(e.reason?.message || 'Something went wrong', 'error');
});
