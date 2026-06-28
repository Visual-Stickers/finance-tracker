// income.js - Income & Expense page logic

let currentMonthKey = Utils.monthKey(new Date());
let currentExpenseId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Storage.seedFromMasterData();
  document.getElementById('navDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  document.getElementById('prevMonth').addEventListener('click', () => shiftMonth(-1));
  document.getElementById('nextMonth').addEventListener('click', () => shiftMonth(1));
  document.getElementById('im-save').addEventListener('click', saveIncome);
  document.getElementById('em-save').addEventListener('click', saveExpense);
  renderPage();
});

function shiftMonth(dir) {
  const [y, m] = currentMonthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  currentMonthKey = Utils.monthKey(d);
  renderPage();
}

function renderPage() {
  document.getElementById('monthLabel').textContent = Utils.monthLabel(currentMonthKey);
  const months = Storage.getMonths();
  const m = months[currentMonthKey];

  if (!m) {
    document.getElementById('incomeList').innerHTML = '<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>No plan for this month</p></div>';
    document.getElementById('expenseList').innerHTML = '';
    ['sum-planned-income','sum-actual-income','sum-planned-exp','sum-actual-exp','income-total','expense-total'].forEach(id => document.getElementById(id).textContent = '—');
    return;
  }

  renderIncome(m);
  renderExpenses(m);
  renderSummary(m);
}

function renderIncome(m) {
  const el = document.getElementById('incomeList');
  const statusClass = m.incomeStatus === 'received' ? 'status-success' : 'status-info';
  const statusIcon  = m.incomeStatus === 'received' ? 'fa-check-circle' : 'fa-hourglass-half';
  const statusLabel = m.incomeStatus === 'received' ? 'Received' : 'Expected';

  const actualText = m.incomeActual != null ? Utils.currency(m.incomeActual) : '—';

  el.innerHTML = `
    <div class="ie-item">
      <div class="ie-item-icon" style="background:rgba(16,185,129,0.15);color:#10b981">
        <i class="fa-solid fa-briefcase"></i>
      </div>
      <div class="ie-item-body">
        <div class="ie-item-name">Salary / Income</div>
        <div class="ie-item-sub">
          <span class="status-pill ${statusClass}"><i class="fa-solid ${statusIcon}"></i> ${statusLabel}</span>
          ${m.incomeDate ? ' · ' + Utils.shortDate(m.incomeDate) : ''}
          ${m.incomeNote ? ' · ' + m.incomeNote : ''}
        </div>
      </div>
      <div class="ie-item-right">
        <div class="ie-item-amount" style="color:var(--accent-green)">${actualText}</div>
        <div class="ie-item-planned">Planned: ${Utils.currency(m.income)}</div>
      </div>
      <div class="ie-item-action">
        ${m.incomeStatus !== 'received'
          ? `<button class="btn btn-success btn-sm" onclick="openIncomeModal()"><i class="fa-solid fa-check"></i> Mark</button>`
          : `<button class="btn btn-ghost btn-sm" onclick="openIncomeModal()"><i class="fa-solid fa-pen"></i></button>`
        }
      </div>
    </div>
  `;

  document.getElementById('income-total').textContent = m.incomeActual != null ? Utils.currency(m.incomeActual) : Utils.currency(m.income) + ' (planned)';
}

function renderExpenses(m) {
  const expIcons = {
    'HDFC Loan': { icon: 'fa-landmark', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    'Rent':       { icon: 'fa-house',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    'Amma':       { icon: 'fa-heart',    color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
    'Monthly seat':{ icon: 'fa-chair',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    'Miscellaneous':{ icon: 'fa-ellipsis', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  };

  const el = document.getElementById('expenseList');
  const items = m.expenseItems || [];

  if (!items.length) { el.innerHTML = '<div class="empty-state"><p>No expenses</p></div>'; return; }

  el.innerHTML = items.map(e => {
    const meta = expIcons[e.name] || { icon: 'fa-receipt', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
    const sc = e.status === 'paid' ? 'status-success' : e.status === 'skipped' ? 'status-muted' : 'status-warning';
    const si = e.status === 'paid' ? 'fa-check-circle' : e.status === 'skipped' ? 'fa-times-circle' : 'fa-clock';
    const sl = e.status === 'paid' ? 'Paid' : e.status === 'skipped' ? 'Skipped' : 'Pending';
    const actualText = e.actual != null ? Utils.currency(e.actual) : '—';
    return `
      <div class="ie-item">
        <div class="ie-item-icon" style="background:${meta.bg};color:${meta.color}">
          <i class="fa-solid ${meta.icon}"></i>
        </div>
        <div class="ie-item-body">
          <div class="ie-item-name">${e.name}</div>
          <div class="ie-item-sub">
            <span class="status-pill ${sc}"><i class="fa-solid ${si}"></i> ${sl}</span>
            ${e.date ? ' · ' + Utils.shortDate(e.date) : ''}
            ${e.note ? ' · ' + e.note : ''}
          </div>
        </div>
        <div class="ie-item-right">
          <div class="ie-item-amount" style="color:var(--accent-red)">${actualText}</div>
          <div class="ie-item-planned">Planned: ${Utils.currency(e.planned)}</div>
        </div>
        <div class="ie-item-action">
          ${e.status !== 'paid'
            ? `<button class="btn btn-primary btn-sm" onclick="openExpenseModal('${e.id}')"><i class="fa-solid fa-check"></i> Mark</button>`
            : `<button class="btn btn-ghost btn-sm" onclick="openExpenseModal('${e.id}')"><i class="fa-solid fa-pen"></i></button>`
          }
        </div>
      </div>
    `;
  }).join('');

  const totalPlanned = items.reduce((s, e) => s + (e.planned || 0), 0);
  const totalActual  = items.reduce((s, e) => s + (e.actual || 0), 0);
  document.getElementById('expense-total').textContent = totalActual ? Utils.currency(totalActual) : Utils.currency(totalPlanned) + ' (planned)';
}

function renderSummary(m) {
  const items = m.expenseItems || [];
  const plannedExp = items.reduce((s, e) => s + (e.planned || 0), 0);
  const actualExp  = items.reduce((s, e) => s + (e.actual  || 0), 0);
  document.getElementById('sum-planned-income').textContent = Utils.currency(m.income);
  document.getElementById('sum-actual-income').textContent  = Utils.currency(m.incomeActual || 0);
  document.getElementById('sum-planned-exp').textContent    = Utils.currency(plannedExp);
  document.getElementById('sum-actual-exp').textContent     = Utils.currency(actualExp);
}

// --- Income Modal ---
function openIncomeModal() {
  const months = Storage.getMonths();
  const m = months[currentMonthKey];
  if (!m) return;
  document.getElementById('im-planned').value = Utils.currency(m.income);
  document.getElementById('im-actual').value  = m.incomeActual || '';
  document.getElementById('im-date').value    = m.incomeDate || new Date().toISOString().split('T')[0];
  document.getElementById('im-note').value    = m.incomeNote || '';
  Utils.openModal('incomeModal');
}

function saveIncome() {
  const months = Storage.getMonths();
  const m = months[currentMonthKey];
  if (!m) return;
  const actual = parseFloat(document.getElementById('im-actual').value);
  if (isNaN(actual)) { Utils.showToast('Enter a valid amount', 'error'); return; }
  m.incomeActual = actual;
  m.incomeStatus = 'received';
  m.incomeDate   = document.getElementById('im-date').value;
  m.incomeNote   = document.getElementById('im-note').value;
  Storage.saveMonths(months);
  Utils.closeModal('incomeModal');
  Utils.showToast('Income marked as received!');
  renderPage();
}

// --- Expense Modal ---
function openExpenseModal(expId) {
  const months = Storage.getMonths();
  const m = months[currentMonthKey];
  if (!m) return;
  const exp = (m.expenseItems || []).find(e => e.id === expId);
  if (!exp) return;
  currentExpenseId = expId;
  document.getElementById('em-title').textContent  = exp.name;
  document.getElementById('em-planned').value = Utils.currency(exp.planned);
  document.getElementById('em-actual').value  = exp.actual || exp.planned || '';
  document.getElementById('em-date').value    = exp.date || new Date().toISOString().split('T')[0];
  document.getElementById('em-status').value  = exp.status === 'skipped' ? 'skipped' : 'paid';
  document.getElementById('em-note').value    = exp.note || '';
  Utils.openModal('expenseModal');
}

function saveExpense() {
  const months = Storage.getMonths();
  const m = months[currentMonthKey];
  if (!m) return;
  const exp = (m.expenseItems || []).find(e => e.id === currentExpenseId);
  if (!exp) return;
  const actual = parseFloat(document.getElementById('em-actual').value);
  if (isNaN(actual)) { Utils.showToast('Enter a valid amount', 'error'); return; }
  exp.actual = actual;
  exp.status = document.getElementById('em-status').value;
  exp.date   = document.getElementById('em-date').value;
  exp.note   = document.getElementById('em-note').value;
  Storage.saveMonths(months);
  Utils.closeModal('expenseModal');
  Utils.showToast('Expense updated!');
  renderPage();
}
