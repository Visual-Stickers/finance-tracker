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

  // ── New Export Utilities ──
  function exportToCSV(filename, data) {
    if (!data || data.length === 0) {
      toast('No data to export', 'error');
      return;
    }
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => 
      headers.map(h => {
        const val = row[h];
        if (val == null) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    )].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadFile(blob, `${filename}.csv`);
    toast('Report exported as CSV');
  }

  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Data Sync Helper ──
  function notifyDataChanged() {
    // Broadcast event to all tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('finance_tracker_data');
      bc.postMessage({ type: 'data_changed', timestamp: Date.now() });
      bc.close();
    }
    // Store timestamp for same-tab detection
    localStorage.setItem('_finance_tracker_sync', Date.now().toString());
  }

  return { 
    currency, shortDate, monthKey, monthLabel, toast, openModal, closeModal,
    exportToCSV, downloadFile, notifyDataChanged
  };
})();
