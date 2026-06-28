// dashboard.js - Finance Command Center Dashboard

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Storage.seedFromMasterData();
  initNav();
  renderDashboard();
});

function initNav() {
  const now = new Date();
  document.getElementById('navDate').textContent = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const h = now.getHours();
  const greeting = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  document.getElementById('greeting').textContent = greeting;

  const mk = Utils.monthKey(now);
  document.getElementById('dashSubtitle').textContent = `Financial overview • ${Utils.monthLabel(mk)}`;
}

function calcCurrentBalance() {
  const months = Storage.getMonths();
  let balance = 0;
  Object.values(months).forEach(m => {
    if (m.incomeStatus === 'received' && m.incomeActual != null) {
      balance += m.incomeActual;
    }
    (m.expenseItems || []).forEach(e => {
      if (e.status === 'paid' && e.actual != null) {
        balance -= e.actual;
      }
    });
  });
  return balance;
}

function getLoanOutstanding() {
  const loans = Storage.getLoans();
  return loans.reduce((s, l) => s + (l.outstanding || 0), 0);
}

function renderDashboard() {
  const balance = calcCurrentBalance();
  const loanOS  = getLoanOutstanding();
  const ccOS    = 0; // no cards yet

  document.getElementById('sc-balance').textContent = Utils.currency(balance);
  document.getElementById('sc-loan').textContent    = Utils.currency(loanOS);
  document.getElementById('sc-cc').textContent      = Utils.currency(ccOS);
  document.getElementById('sc-networth').textContent = Utils.currency(balance - loanOS - ccOS);

  renderTasks();
  renderInsights(balance, loanOS);
  renderLoanProgress();
  renderIncomeExpenseChart();
  renderCashflowChart();
  renderExpenseBreakdown();
}

function renderTasks() {
  const now = new Date();
  const mk = Utils.monthKey(now);
  const months = Storage.getMonths();
  const m = months[mk];
  const tasks = [];

  if (m) {
    if (m.incomeStatus !== 'received') {
      tasks.push({ dot: 'blue', name: 'Salary / Income not yet marked as received', meta: 'Expected this month' });
    }
    (m.expenseItems || []).forEach(e => {
      if (e.status === 'pending' && e.planned > 0) {
        const dot = e.name.includes('Loan') ? 'red' : e.name === 'Rent' ? 'yellow' : 'green';
        tasks.push({ dot, name: `${e.name} payment pending`, meta: Utils.currency(e.planned) + ' planned' });
      }
    });
  }

  const el = document.getElementById('taskList');
  const cnt = document.getElementById('taskCount');
  cnt.textContent = `${tasks.length} pending`;
  cnt.className = tasks.length ? 'card-badge badge-warning' : 'card-badge badge-success';

  if (!tasks.length) {
    el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-check-circle" style="color:var(--accent-green)"></i><p>All tasks complete!</p></div>`;
    return;
  }

  el.innerHTML = tasks.map(t => `
    <div class="task-item">
      <div class="task-dot ${t.dot}"></div>
      <div class="task-name">${t.name}</div>
      <div class="task-meta">${t.meta}</div>
    </div>
  `).join('');
}

function renderInsights(balance, loanOS) {
  const loans = Storage.getLoans();
  const months = Storage.getMonths();
  const mk = Utils.monthKey(new Date());
  const m = months[mk];

  const insights = [];

  // Loan interest insight
  if (loans.length) {
    const l = loans[0];
    const pct = (((l.principal - l.outstanding) / l.principal) * 100).toFixed(1);
    insights.push({ icon: 'fa-landmark', color: 'red', text: `HDFC Personal Loan: <strong>${pct}% paid off</strong>. ${l.emisRemaining} EMIs remaining. Outstanding: <strong>${Utils.currency(l.outstanding)}</strong>.` });
    const daysToEmi = Utils.daysUntil(l.emiStartDate);
    if (daysToEmi >= 0 && daysToEmi <= 10) {
      insights.push({ icon: 'fa-bell', color: 'yellow', text: `Next EMI of <strong>${Utils.currency(l.emi)}</strong> due in <strong>${daysToEmi} day${daysToEmi !== 1 ? 's' : ''}</strong>.` });
    }
  }

  // Monthly planned balance
  if (m) {
    const totalPlanned = (m.expenseItems || []).reduce((s, e) => s + (e.planned || 0), 0);
    const plannedBalance = m.income - totalPlanned;
    insights.push({ icon: 'fa-calculator', color: 'blue', text: `This month's planned surplus: <strong>${Utils.currency(plannedBalance)}</strong> (₹${Utils.currency(m.income)} income − ₹${Utils.currency(totalPlanned)} expenses).` });
  }

  // Current balance note
  if (balance === 0) {
    insights.push({ icon: 'fa-info-circle', color: 'teal', text: 'Mark your income as <strong>Received</strong> and expenses as <strong>Paid</strong> on the Income & Expense page to track your actual balance.' });
  }

  const colors = { red: 'rgba(239,68,68,0.15)', blue: 'rgba(59,130,246,0.15)', yellow: 'rgba(245,158,11,0.15)', teal: 'rgba(6,182,212,0.15)', green: 'rgba(16,185,129,0.15)' };
  const textC = { red: '#ef4444', blue: '#3b82f6', yellow: '#f59e0b', teal: '#06b6d4', green: '#10b981' };

  document.getElementById('insightList').innerHTML = insights.map(ins => `
    <div class="insight-item">
      <div class="insight-icon" style="background:${colors[ins.color]};color:${textC[ins.color]}">
        <i class="fa-solid ${ins.icon}"></i>
      </div>
      <div class="insight-text">${ins.text}</div>
    </div>
  `).join('');
}

function renderLoanProgress() {
  const loans = Storage.getLoans();
  const el = document.getElementById('loanProgressList');
  if (!loans.length) { el.innerHTML = '<div class="empty-state"><p>No loans</p></div>'; return; }

  el.innerHTML = loans.map(l => {
    const pct = Math.round(((l.principal - l.outstanding) / l.principal) * 100);
    return `
      <div class="loan-mini">
        <div style="flex:1">
          <div class="loan-mini-name">${l.name}</div>
          <div class="progress-wrap" style="margin-top:8px">
            <div class="progress-label">
              <span>${pct}% paid</span>
              <span>${l.emisPaid}/${l.tenure} EMIs</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${pct}%;background:var(--grad-blue)"></div>
            </div>
          </div>
        </div>
        <div class="loan-mini-val">
          <div style="font-weight:700;font-size:13px">${Utils.currency(l.outstanding)}</div>
          <div style="font-size:11px;color:var(--text-muted)">outstanding</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderIncomeExpenseChart() {
  const months = Storage.getMonths();
  const plan = MASTER_DATA.monthlyPlan.months.slice(0, 8);

  const labels = plan.map(m => m.label.split(' ')[0]);
  const incomes = plan.map(m => m.income);
  const expenses = plan.map(m => Object.values(m.expenses).reduce((s, v) => s + (v || 0), 0));

  const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income', data: incomes, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 },
        { label: 'Expense', data: expenses, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6 },
      ]
    },
    options: chartDefaults({
      plugins: { legend: { labels: { color: '#8899bb', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#8899bb', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8899bb', font: { size: 11 }, callback: v => '₹' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.06)' } }
      }
    })
  });
}

function renderCashflowChart() {
  const plan = MASTER_DATA.monthlyPlan.months.slice(0, 10);
  const labels = plan.map(m => m.label.split(' ')[0]);
  const balances = plan.map(m => m.balance);

  const ctx = document.getElementById('cashflowChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Planned Balance',
        data: balances,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 4,
      }]
    },
    options: chartDefaults({
      scales: {
        x: { ticks: { color: '#8899bb', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8899bb', font: { size: 11 }, callback: v => '₹' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.06)' } }
      }
    })
  });
}

function renderExpenseBreakdown() {
  const plan = MASTER_DATA.monthlyPlan.months[0];
  const entries = Object.entries(plan.expenses).filter(([, v]) => v > 0);
  const labels = entries.map(([k]) => k);
  const data   = entries.map(([, v]) => v);
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'];

  const ctx = document.getElementById('expenseBreakChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      ...chartDefaults({}),
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8899bb', font: { size: 11 }, padding: 12, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${Utils.currency(ctx.raw)}`
          }
        }
      }
    }
  });
}

function chartDefaults(extra) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 600 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a2235',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#f0f4ff',
        bodyColor: '#8899bb',
        callbacks: {
          label: ctx => ` ${Utils.currency(ctx.raw)}`
        }
      },
      ...(extra.plugins || {})
    },
    scales: extra.scales || {},
    ...Object.fromEntries(Object.entries(extra).filter(([k]) => !['plugins','scales'].includes(k)))
  };
}
