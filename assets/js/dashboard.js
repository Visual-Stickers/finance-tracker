// dashboard.js - Finance Command Center Dashboard

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Storage.seedFromMasterData();
  await Theme.init();
  initNav();
  await renderDashboard();
});

function initNav() {
  const now = new Date();
  document.getElementById('navDate').textContent = now.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  const h = now.getHours();
  const greeting = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  document.getElementById('greeting').textContent = greeting;
  const mk = Utils.monthKey(now);
  document.getElementById('dashSubtitle').textContent = `Financial overview • ${Utils.monthLabel(mk)}`;
}

async function renderDashboard() {
  const [months, loans, cards] = await Promise.all([
    Storage.getMonths(),
    Storage.getLoans(),
    Storage.getCreditCards()
  ]);

  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeCards = Array.isArray(cards) ? cards : [];

  const balance = calcCurrentBalance(months);
  const loanOS  = safeLoans.reduce((s, l) => s + (Number(l.outstanding) || 0), 0);
  const ccOS    = safeCards.reduce((s, c) => s + (Number(c.outstanding) || 0), 0);
  const networth = balance - loanOS - ccOS;

  document.getElementById('sc-balance').textContent  = Utils.currency(balance);
  document.getElementById('sc-loan').textContent     = Utils.currency(loanOS);
  document.getElementById('sc-cc').textContent       = Utils.currency(ccOS);
  document.getElementById('sc-networth').textContent = Utils.currency(networth);

  renderTasks(months);
  renderInsights(months, safeLoans, balance, ccOS);
  renderLoanProgress(safeLoans);
  renderIncomeExpenseChart(months);
  renderCashflowChart(months);
  renderExpenseBreakdown(months);
}

function calcCurrentBalance(months) {
  let balance = 0;
  Object.values(months).forEach(m => {
    if (m.incomeStatus === 'received' && m.incomeActual != null) balance += Number(m.incomeActual);
    (m.additionalIncomes || []).forEach(a => { if (a.status === 'received' && a.actual != null) balance += Number(a.actual); });
    (m.expenseItems || []).forEach(e => { if (e.status === 'paid' && e.actual != null) balance -= Number(e.actual); });
  });
  return balance;
}

function renderTasks(months) {
  const mk = Utils.monthKey(new Date());
  const m = months[mk];
  const tasks = [];
  if (m) {
    if (m.incomeStatus !== 'received') {
      tasks.push({ dot: 'blue', name: 'Salary / Income not yet marked as received', meta: `Expected: ${Utils.currency(m.income)}` });
    }
    (m.expenseItems || []).forEach(e => {
      if (e.status === 'pending' && (e.planned || 0) > 0) {
        tasks.push({ dot: e.name.includes('Loan') ? 'red' : 'yellow', name: `${e.name} payment pending`, meta: Utils.currency(e.planned) + ' planned' });
      }
    });
  }
  const el  = document.getElementById('taskList');
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
    </div>`).join('');
}

function renderInsights(months, loans, balance, ccOS) {
  const mk = Utils.monthKey(new Date());
  const m  = months[mk];
  const insights = [];
  if (loans.length) {
    const l = loans[0];
    const pct = l.principal ? (((l.principal - l.outstanding) / l.principal) * 100).toFixed(1) : 0;
    insights.push({ icon: 'fa-landmark', color: 'red', text: `${l.name}: <strong>${pct}% paid off</strong>. ${l.emisRemaining} EMIs remaining. Outstanding: <strong>${Utils.currency(l.outstanding)}</strong>.` });
  }
  if (ccOS > 0) {
    insights.push({ icon: 'fa-credit-card', color: 'orange', text: `Credit card outstanding: <strong>${Utils.currency(ccOS)}</strong>. Pay before due date to avoid interest.` });
  }
  if (m) {
    const totalPlanned = (m.expenseItems || []).reduce((s, e) => s + (e.planned || 0), 0);
    const surplus = (m.income || 0) - totalPlanned;
    insights.push({ icon: 'fa-calculator', color: 'blue', text: `This month's planned surplus: <strong>${Utils.currency(surplus)}</strong> (${Utils.currency(m.income)} income − ${Utils.currency(totalPlanned)} expenses).` });
  }
  if (balance === 0) {
    insights.push({ icon: 'fa-info-circle', color: 'teal', text: 'Mark your income as <strong>Received</strong> and expenses as <strong>Paid</strong> on the Income & Expense page to track your actual balance.' });
  }
  const bg = { red:'rgba(239,68,68,0.15)', blue:'rgba(59,130,246,0.15)', yellow:'rgba(245,158,11,0.15)', teal:'rgba(6,182,212,0.15)', green:'rgba(16,185,129,0.15)', orange:'rgba(249,115,22,0.15)' };
  const tc = { red:'#ef4444', blue:'#3b82f6', yellow:'#f59e0b', teal:'#06b6d4', green:'#10b981', orange:'#f97316' };
  document.getElementById('insightList').innerHTML = insights.map(ins => `
    <div class="insight-item">
      <div class="insight-icon" style="background:${bg[ins.color]};color:${tc[ins.color]}"><i class="fa-solid ${ins.icon}"></i></div>
      <div class="insight-text">${ins.text}</div>
    </div>`).join('');
}

function renderLoanProgress(loans) {
  const el = document.getElementById('loanProgressList');
  if (!loans.length) { el.innerHTML = '<div class="empty-state"><p>No loans added yet</p></div>'; return; }
  el.innerHTML = loans.map(l => {
    const pct = l.principal ? Math.round(((l.principal - l.outstanding) / l.principal) * 100) : 0;
    return `
      <div class="loan-mini">
        <div style="flex:1">
          <div class="loan-mini-name">${l.name}</div>
          <div class="progress-wrap" style="margin-top:8px">
            <div class="progress-label"><span>${pct}% paid</span><span>${l.emisPaid}/${l.tenure} EMIs</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:var(--grad-blue)"></div></div>
          </div>
        </div>
        <div class="loan-mini-val">
          <div style="font-weight:700;font-size:13px">${Utils.currency(l.outstanding)}</div>
          <div style="font-size:11px;color:var(--text-muted)">outstanding</div>
        </div>
      </div>`;
  }).join('');
}

function renderIncomeExpenseChart(months) {
  const sorted   = Object.values(months).sort((a,b) => a.key > b.key ? 1 : -1).slice(-8);
  const labels   = sorted.map(m => (m.label||m.key).split(' ')[0]);
  const incomes  = sorted.map(m => m.incomeActual || m.income || 0);
  const expenses = sorted.map(m => (m.expenseItems||[]).reduce((s,e) => s+(e.actual||e.planned||0), 0));
  const ctx = document.getElementById('incomeExpenseChart');
  if (!ctx) return;
  new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [
      { label:'Income',  data: incomes,  backgroundColor:'rgba(16,185,129,0.7)', borderRadius:6 },
      { label:'Expense', data: expenses, backgroundColor:'rgba(239,68,68,0.7)',  borderRadius:6 },
    ]},
    options: chartOpts({ plugins: { legend: { labels: { color:'#8899bb', font:{ size:11 } } } } })
  });
}

function renderCashflowChart(months) {
  const sorted   = Object.values(months).sort((a,b) => a.key > b.key ? 1 : -1).slice(-10);
  const labels   = sorted.map(m => (m.label||m.key).split(' ')[0]);
  const balances = sorted.map(m => m.balance || 0);
  const ctx = document.getElementById('cashflowChart');
  if (!ctx) return;
  new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ label:'Planned Balance', data: balances,
      borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.1)', fill:true, tension:0.4,
      pointBackgroundColor:'#3b82f6', pointRadius:4 }]},
    options: chartOpts({})
  });
}

function renderExpenseBreakdown(months) {
  const mk = Utils.monthKey(new Date());
  const m  = months[mk] || Object.values(months).sort((a,b)=>a.key>b.key?-1:1)[0];
  if (!m) return;
  // Include items with actual spend even if planned=0 (e.g. Miscellaneous)
  const items  = (m.expenseItems||[]).filter(e => (e.planned||0) > 0 || (e.actual||0) > 0);
  const labels = items.map(e => e.name);
  const data   = items.map(e => e.actual || e.planned || 0);
  const colors = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#f97316','#06b6d4','#ec4899'];
  const ctx = document.getElementById('expenseBreakChart');
  if (!ctx) return;
  new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth:0, hoverOffset:6 }] },
    options: {
      responsive:true, maintainAspectRatio:true, cutout:'65%',
      plugins: {
        legend: { position:'bottom', labels:{ color:'#8899bb', font:{size:11}, padding:12, usePointStyle:true } },
        tooltip: { callbacks:{ label: ctx => ` ${Utils.currency(ctx.raw)}` } }
      }
    }
  });
}

function chartOpts(extra) {
  return {
    responsive:true, maintainAspectRatio:true, animation:{ duration:600 },
    plugins: {
      legend:{ display:false },
      tooltip:{ backgroundColor:'#1a2235', borderColor:'rgba(255,255,255,0.1)', borderWidth:1,
                titleColor:'#f0f4ff', bodyColor:'#8899bb',
                callbacks:{ label: ctx => ` ${Utils.currency(ctx.raw)}` } },
      ...(extra.plugins||{})
    },
    scales: {
      x:{ ticks:{ color:'#8899bb', font:{size:11} }, grid:{ color:'rgba(255,255,255,0.04)' } },
      y:{ ticks:{ color:'#8899bb', font:{size:11}, callback: v => '₹'+(v/1000).toFixed(0)+'k' }, grid:{ color:'rgba(255,255,255,0.06)' } }
    }
  };
}
