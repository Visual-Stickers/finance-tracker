// reports.js - Reports page with Monthly & Yearly views

let _allMonths = {};
let _allLoans  = [];
let _currentReportMonth = Utils.monthKey(new Date());
let _currentReportYear  = new Date().getFullYear();
let _rptPickerYear = new Date().getFullYear();
let _activeTab = 'monthly';
let _charts = {}; // track chart instances to destroy before redraw

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Storage.seedFromMasterData();
  await Theme.init();
  document.getElementById('navDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

  [_allMonths, _allLoans] = await Promise.all([Storage.getMonths(), Storage.getLoans()]);

  renderMonthlyView();
});

// ─── TABS ─────────────────────────────────────────────────────────────────

function switchTab(tab) {
  _activeTab = tab;
  document.getElementById('view-monthly').style.display = tab === 'monthly' ? '' : 'none';
  document.getElementById('view-yearly').style.display  = tab === 'yearly'  ? '' : 'none';
  document.getElementById('tab-monthly').classList.toggle('active', tab === 'monthly');
  document.getElementById('tab-yearly').classList.toggle('active', tab === 'yearly');
  if (tab === 'monthly') renderMonthlyView();
  else renderYearlyView();
}

// ─── CHART HELPERS ────────────────────────────────────────────────────────

function destroyChart(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

function makeChart(id, config) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  _charts[id] = new Chart(ctx.getContext('2d'), config);
}

const tooltip = {
  backgroundColor: '#1a2235',
  borderColor: 'rgba(255,255,255,0.1)',
  borderWidth: 1,
  titleColor: '#f0f4ff',
  bodyColor: '#8899bb',
  callbacks: { label: ctx => ' ' + Utils.currency(ctx.raw) }
};

const scales = {
  x: { ticks: { color: '#8899bb', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
  y: { ticks: { color: '#8899bb', font: { size: 11 }, callback: v => '₹' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.06)' } }
};

function baseOpts(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 500 },
    plugins: { legend: { labels: { color: '#8899bb', font: { size: 11 } } }, tooltip, ...(extra.plugins||{}) },
    scales,
    ...(extra)
  };
}

// ─── MONTHLY VIEW ─────────────────────────────────────────────────────────

function renderMonthlyView() {
  document.getElementById('rpt-monthLabel').textContent = Utils.monthLabel(_currentReportMonth);
  const m = _allMonths[_currentReportMonth];

  if (!m) {
    ['m-planned-income','m-actual-income','m-planned-exp','m-actual-exp'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    ['m-ie-chart','m-exp-break'].forEach(destroyChart);
    document.getElementById('m-table').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">No data for this month</td></tr>';
    return;
  }

  const items       = m.expenseItems || [];
  const plannedExp  = items.reduce((s, e) => s + (e.planned||0), 0);
  const actualExp   = items.reduce((s, e) => s + (e.actual||0), 0);

  document.getElementById('m-planned-income').textContent = Utils.currency(m.income || 0);
  document.getElementById('m-actual-income').textContent  = Utils.currency(m.incomeActual || 0);
  document.getElementById('m-planned-exp').textContent    = Utils.currency(plannedExp);
  document.getElementById('m-actual-exp').textContent     = Utils.currency(actualExp);

  // Income vs Expense bar
  makeChart('m-ie-chart', {
    type: 'bar',
    data: {
      labels: ['Planned Income', 'Actual Income', 'Planned Expenses', 'Actual Expenses'],
      datasets: [{
        data: [m.income||0, m.incomeActual||0, plannedExp, actualExp],
        backgroundColor: ['rgba(16,185,129,0.7)','rgba(16,185,129,1)','rgba(239,68,68,0.7)','rgba(239,68,68,1)'],
        borderRadius: 6
      }]
    },
    options: baseOpts({ plugins: { legend: { display: false }, tooltip } })
  });

  // Expense breakdown doughnut
  const expLabels = items.filter(e => e.planned > 0).map(e => e.name);
  const expData   = items.filter(e => e.planned > 0).map(e => e.planned);
  const colors    = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#f97316','#06b6d4','#ec4899'];

  makeChart('m-exp-break', {
    type: 'doughnut',
    data: { labels: expLabels, datasets: [{ data: expData, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8899bb', font: { size: 11 }, padding: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => ' ' + Utils.currency(ctx.raw) } }
      }
    }
  });

  // Expense detail table
  const thead = `<thead><tr><th>Expense</th><th>Planned</th><th>Actual</th><th>Status</th></tr></thead>`;
  const tbody = `<tbody>${items.map(e => {
    const sc = e.status === 'paid' ? 'color:var(--accent-green)' : e.status === 'skipped' ? 'color:var(--text-muted)' : 'color:var(--accent-yellow)';
    return `<tr>
      <td style="font-weight:600">${e.name}</td>
      <td>${Utils.currency(e.planned||0)}</td>
      <td>${e.actual != null ? Utils.currency(e.actual) : '—'}</td>
      <td><span style="${sc};font-weight:500;text-transform:capitalize">${e.status||'pending'}</span></td>
    </tr>`;
  }).join('')}</tbody>`;
  document.getElementById('m-table').innerHTML = thead + tbody;
}

async function shiftReportMonth(dir) {
  const [y, m] = _currentReportMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  _currentReportMonth = Utils.monthKey(d);
  renderMonthlyView();
}

// Monthly picker
function openRptMonthPicker() {
  const [y] = _currentReportMonth.split('-').map(Number);
  _rptPickerYear = y;
  renderRptPickerGrid();
  document.getElementById('rptMonthPicker').style.display = 'block';
  document.getElementById('rptPickerOverlay').style.display = 'block';
}
function closeRptMonthPicker() {
  document.getElementById('rptMonthPicker').style.display = 'none';
  document.getElementById('rptPickerOverlay').style.display = 'none';
}
function shiftRptPickerYear(dir) { _rptPickerYear += dir; renderRptPickerGrid(); }
function renderRptPickerGrid() {
  document.getElementById('rptPickerYear').textContent = _rptPickerYear;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [cy, cm] = _currentReportMonth.split('-').map(Number);
  document.getElementById('rptPickerGrid').innerHTML = months.map((name, i) => {
    const mk = `${_rptPickerYear}-${String(i+1).padStart(2,'0')}`;
    const hasData = !!_allMonths[mk];
    const isActive = (_rptPickerYear === cy && i+1 === cm);
    return `<button class="picker-month-btn ${isActive?'active':''} ${hasData?'has-data':''}"
      onclick="jumpRptMonth('${mk}')">${name}</button>`;
  }).join('');
}
function jumpRptMonth(mk) {
  _currentReportMonth = mk;
  closeRptMonthPicker();
  renderMonthlyView();
}

// ─── YEARLY VIEW ──────────────────────────────────────────────────────────

function renderYearlyView() {
  document.getElementById('rpt-yearLabel').textContent = _currentReportYear;

  // Filter months for this year
  const yearMonths = Object.values(_allMonths)
    .filter(m => m.key && m.key.startsWith(String(_currentReportYear)))
    .sort((a, b) => a.key > b.key ? 1 : -1);

  const totalIncome = yearMonths.reduce((s, m) => s + (m.income||0), 0);
  const totalExp    = yearMonths.reduce((s, m) => s + (m.expenseItems||[]).reduce((a,e) => a+(e.planned||0), 0), 0);
  const loanOS      = _allLoans.reduce((s, l) => s + (l.outstanding||0), 0);
  const savings     = totalIncome - totalExp;

  document.getElementById('y-total-income').textContent = Utils.currency(totalIncome);
  document.getElementById('y-total-exp').textContent    = Utils.currency(totalExp);
  document.getElementById('y-loan-os').textContent      = Utils.currency(loanOS);
  document.getElementById('y-savings').textContent      = Utils.currency(savings);

  const labels   = yearMonths.map(m => (m.label||m.key).split(' ')[0]);
  const incomes  = yearMonths.map(m => m.income||0);
  const expenses = yearMonths.map(m => (m.expenseItems||[]).reduce((s,e)=>s+(e.planned||0),0));

  // Monthly Income vs Expense bar
  makeChart('y-ie-chart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income',  data: incomes,  backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
        { label: 'Expense', data: expenses, backgroundColor: 'rgba(239,68,68,0.7)',  borderRadius: 4 },
      ]
    },
    options: baseOpts()
  });

  // Cumulative balance line
  let running = 0;
  const balances = yearMonths.map(m => { running += (m.balance||0); return running; });
  makeChart('y-balance-chart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Cumulative Balance',
        data: balances,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true, tension: 0.4,
        pointBackgroundColor: '#3b82f6', pointRadius: 4,
      }]
    },
    options: baseOpts()
  });

  // Expense breakdown doughnut (yearly totals)
  const totals = {};
  yearMonths.forEach(m => {
    (m.expenseItems||[]).forEach(e => { totals[e.name] = (totals[e.name]||0) + (e.planned||0); });
  });
  const expEntries = Object.entries(totals).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const colors = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#f97316','#06b6d4','#ec4899'];

  makeChart('y-exp-break', {
    type: 'doughnut',
    data: {
      labels: expEntries.map(([k])=>k),
      datasets: [{ data: expEntries.map(([,v])=>v), backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8899bb', font: { size: 11 }, padding: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => ' ' + Utils.currency(ctx.raw) } }
      }
    }
  });

  // Loan forecast line
  if (_allLoans.length) {
    const l = _allLoans[0];
    const months = Math.min(l.emisRemaining||24, 24);
    const lLabels = [], lBalances = [];
    let bal = l.outstanding;
    const mi = (l.interestRate||0) / 100 / 12;
    for (let i = 0; i <= months; i++) {
      lLabels.push(`M+${i}`);
      lBalances.push(Math.max(0, Math.round(bal)));
      bal -= ((l.emi||0) - bal * mi);
    }
    makeChart('y-loan-chart', {
      type: 'line',
      data: {
        labels: lLabels,
        datasets: [{
          label: 'Loan Outstanding',
          data: lBalances,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true, tension: 0.4,
          pointBackgroundColor: '#ef4444', pointRadius: 2,
        }]
      },
      options: baseOpts()
    });
  }

  // Year summary table
  const thead = `<thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Balance</th><th>Savings Rate</th></tr></thead>`;
  const tbody = `<tbody>${yearMonths.map(m => {
    const exp = (m.expenseItems||[]).reduce((s,e)=>s+(e.planned||0),0);
    const bal = (m.income||0) - exp;
    const rate = m.income ? Math.round((bal / m.income) * 100) : 0;
    const rateColor = rate >= 20 ? 'var(--accent-green)' : rate >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    return `<tr>
      <td style="font-weight:600">${m.label||m.key}</td>
      <td style="color:var(--accent-green)">${Utils.currency(m.income||0)}</td>
      <td style="color:var(--accent-red)">${Utils.currency(exp)}</td>
      <td style="color:var(--accent-blue);font-weight:600">${Utils.currency(bal)}</td>
      <td style="color:${rateColor};font-weight:600">${rate}%</td>
    </tr>`;
  }).join('')}</tbody>`;
  document.getElementById('y-table').innerHTML = thead + tbody;
}

function shiftYear(dir) {
  _currentReportYear += dir;
  renderYearlyView();
}
