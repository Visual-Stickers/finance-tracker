// reports.js - Reports page

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Storage.seedFromMasterData();
  document.getElementById('navDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  await renderReports();
});

async function renderReports() {
  const [months, loans] = await Promise.all([Storage.getMonths(), Storage.getLoans()]);
  const plan = Object.values(months).sort((a, b) => a.key > b.key ? 1 : -1);

  const totalIncome = plan.reduce((s, m) => s + (m.income || 0), 0);
  const totalExp    = plan.reduce((s, m) => s + (m.expenseItems || []).reduce((a, e) => a + (e.planned||0), 0), 0);
  const loanOS      = loans.reduce((s, l) => s + (l.outstanding || 0), 0);
  const networth    = totalIncome - totalExp - loanOS;

  document.getElementById('rpt-total-income').textContent = Utils.currency(totalIncome);
  document.getElementById('rpt-total-exp').textContent    = Utils.currency(totalExp);
  document.getElementById('rpt-loan-os').textContent      = Utils.currency(loanOS);
  document.getElementById('rpt-networth').textContent     = Utils.currency(networth);

  buildIEChart(plan);
  buildBalanceChart(plan);
  buildBreakdownChart(plan);
  buildLoanChart(loans);
  buildTable(plan);
}

const co = {
  responsive: true, maintainAspectRatio: true, animation: { duration: 600 },
  plugins: {
    legend: { labels: { color: '#8899bb', font: { size: 11 } } },
    tooltip: {
      backgroundColor: '#1a2235', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
      titleColor: '#f0f4ff', bodyColor: '#8899bb',
      callbacks: { label: ctx => ' ' + Utils.currency(ctx.raw) }
    }
  },
  scales: {
    x: { ticks: { color: '#8899bb', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    y: { ticks: { color: '#8899bb', font: { size: 11 }, callback: v => '₹' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.06)' } }
  }
};

function buildIEChart(plan) {
  const labels  = plan.map(m => (m.label||m.key).replace(' 20', "'"));
  const incomes = plan.map(m => m.income || 0);
  const exps    = plan.map(m => (m.expenseItems||[]).reduce((s,e)=>s+(e.planned||0),0));
  new Chart(document.getElementById('rpt-ie-chart').getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Income',  data: incomes, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
      { label: 'Expense', data: exps,    backgroundColor: 'rgba(239,68,68,0.7)',  borderRadius: 4 },
    ]},
    options: { ...co }
  });
}

function buildBalanceChart(plan) {
  const labels = plan.map(m => (m.label||m.key).replace(' 20', "'"));
  let running = 0;
  const balances = plan.map(m => { running += (m.balance||0); return running; });
  new Chart(document.getElementById('rpt-balance-chart').getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{
      label: 'Cumulative Balance', data: balances,
      borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true, tension: 0.4, pointBackgroundColor: '#3b82f6', pointRadius: 3,
    }]},
    options: { ...co }
  });
}

function buildBreakdownChart(plan) {
  const totals = {};
  plan.forEach(m => {
    (m.expenseItems||[]).forEach(e => {
      totals[e.name] = (totals[e.name]||0) + (e.planned||0);
    });
  });
  const filtered = Object.entries(totals).filter(([,v])=>v>0);
  const labels = filtered.map(([k])=>k);
  const data   = filtered.map(([,v])=>v);
  const colors = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#f97316'];
  new Chart(document.getElementById('rpt-exp-break').getContext('2d'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]},
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '60%',
      plugins: {
        legend: { position:'bottom', labels: { color:'#8899bb', font:{size:11}, padding:12, usePointStyle:true }},
        tooltip: { callbacks: { label: ctx => ' ' + Utils.currency(ctx.raw) }}
      }
    }
  });
}

function buildLoanChart(loans) {
  if (!loans.length) return;
  const l = loans[0];
  const months = Math.min(l.emisRemaining||24, 24);
  const labels = [], balances = [];
  let bal = l.outstanding;
  const monthlyInterest = (l.interestRate||0) / 100 / 12;
  for (let i = 0; i <= months; i++) {
    labels.push(`M+${i}`);
    balances.push(Math.max(0, Math.round(bal)));
    const interest = bal * monthlyInterest;
    const principal = (l.emi||0) - interest;
    bal -= principal;
  }
  new Chart(document.getElementById('rpt-loan-chart').getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{
      label: 'Loan Outstanding', data: balances,
      borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',
      fill: true, tension: 0.4, pointBackgroundColor: '#ef4444', pointRadius: 2,
    }]},
    options: { ...co }
  });
}

function buildTable(plan) {
  const expCats = [...new Set(plan.flatMap(m => (m.expenseItems||[]).map(e=>e.name)))];
  const thead = `<thead><tr>
    <th>Month</th><th>Income</th>
    ${expCats.map(c=>`<th>${c}</th>`).join('')}
    <th>Balance</th>
  </tr></thead>`;
  const tbody = `<tbody>${plan.map(m => {
    const expMap = {};
    (m.expenseItems||[]).forEach(e => { expMap[e.name] = e.planned||0; });
    return `<tr>
      <td style="font-weight:600">${m.label||m.key}</td>
      <td style="color:var(--accent-green)">${Utils.currency(m.income||0)}</td>
      ${expCats.map(c=>`<td>${Utils.currency(expMap[c]||0)}</td>`).join('')}
      <td style="color:var(--accent-blue);font-weight:600">${Utils.currency(m.balance||0)}</td>
    </tr>`;
  }).join('')}</tbody>`;
  document.getElementById('rpt-table').innerHTML = thead + tbody;
}
