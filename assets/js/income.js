// income.js - Income & Expense page logic

let currentMonthKey = Utils.monthKey(new Date());
let currentExpenseId = null;
let _months = {}; // local cache

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Storage.seedFromMasterData();
  document.getElementById('navDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  document.getElementById('prevMonth').addEventListener('click', () => shiftMonth(-1));
  document.getElementById('nextMonth').addEventListener('click', () => shiftMonth(1));
  document.getElementById('im-save').addEventListener('click', saveIncome);
  document.getElementById('em-save').addEventListener('click', saveExpense);
  await renderPage();
});

async function shiftMonth(dir) {
  const [y, m] = currentMonthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  currentMonthKey = Utils.monthKey(d);
  await renderPage();
}

async function renderPage() {
  document.getElementById('monthLabel').textContent = Utils.monthLabel(currentMonthKey);
  _months = await Storage.getMonths();
  const m = _months[currentMonthKey];

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
  const actualText  = m.incomeActual != null ? Utils.currency(m.incomeActual) : '—';

  // Build additional income rows
  const additionalRows = (m.additionalIncomes || []).map(a => {
    const sc = a.status === 'received' ? 'status-success' : 'status-info';
    const si = a.status === 'received' ? 'fa-check-circle' : 'fa-hourglass-half';
    const sl = a.status === 'received' ? 'Received' : 'Expected';
    const amt = a.actual != null ? Utils.currency(a.actual) : '—';
    return `
      <div class="ie-item">
        <div class="ie-item-icon" style="background:rgba(16,185,129,0.15);color:#10b981">
          <i class="fa-solid fa-coins"></i>
        </div>
        <div class="ie-item-body">
          <div class="ie-item-name">${a.name}</div>
          <div class="ie-item-sub">
            <span class="status-pill ${sc}"><i class="fa-solid ${si}"></i> ${sl}</span>
          </div>
        </div>
        <div class="ie-item-right">
          <div class="ie-item-amount" style="color:var(--accent-green)">${amt}</div>
          <div class="ie-item-planned">Planned: ${Utils.currency(a.planned)}</div>
        </div>
        <div class="ie-item-action">
          <button class="btn btn-ghost btn-sm" onclick="deleteIncomeSource('${a.id}')" title="Delete">
            <i class="fa-solid fa-trash" style="color:var(--accent-red)"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

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
    ${additionalRows}
    <div style="padding:10px 0 4px">
      <button class="btn btn-ghost btn-sm" onclick="openAddIncomeModal()" style="width:100%;border:1px dashed var(--border);color:var(--accent-green)">
        <i class="fa-solid fa-plus"></i> Add Income Source
      </button>
    </div>
  `;

  document.getElementById('income-total').textContent = m.incomeActual != null ? Utils.currency(m.incomeActual) : Utils.currency(m.income) + ' (planned)';
}

function renderExpenses(m) {
  const expIcons = {
    'HDFC Loan':    { icon: 'fa-landmark',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    'Rent':         { icon: 'fa-house',     color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    'Amma':         { icon: 'fa-heart',     color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
    'Monthly seat': { icon: 'fa-chair',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    'Miscellaneous':{ icon: 'fa-ellipsis',  color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  };

  const el = document.getElementById('expenseList');
  const items = m.expenseItems || [];

  let html = items.map(e => {
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

  html += `
    <div style="padding:10px 0 4px">
      <button class="btn btn-ghost btn-sm" onclick="openAddExpenseModal()" style="width:100%;border:1px dashed var(--border);color:var(--accent-red)">
        <i class="fa-solid fa-plus"></i> Add Expense
      </button>
    </div>
  `;

  el.innerHTML = html || '<div class="empty-state"><p>No expenses</p></div>';

  const totalPlanned = items.reduce((s, e) => s + (e.planned || 0), 0);
  const totalActual  = items.reduce((s, e) => s + (e.actual  || 0), 0);
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

// --- Income Modal (mark received) ---
function openIncomeModal() {
  const m = _months[currentMonthKey];
  if (!m) return;
  document.getElementById('im-planned').value = Utils.currency(m.income);
  document.getElementById('im-actual').value  = m.incomeActual || '';
  document.getElementById('im-date').value    = m.incomeDate || new Date().toISOString().split('T')[0];
  document.getElementById('im-note').value    = m.incomeNote || '';
  Utils.openModal('incomeModal');
}

async function saveIncome() {
  const actual = parseFloat(document.getElementById('im-actual').value);
  if (isNaN(actual)) { Utils.showToast('Enter a valid amount', 'error'); return; }
  const ok = await Storage.saveMonthIncome(currentMonthKey, {
    incomeActual: actual,
    incomeStatus: 'received',
    incomeDate: document.getElementById('im-date').value,
    incomeNote: document.getElementById('im-note').value,
  });
  if (!ok) { Utils.showToast('Save failed', 'error'); return; }
  Utils.closeModal('incomeModal');
  Utils.showToast('Income marked as received!');
  await renderPage();
}

// --- Add Income Source Modal ---
function openAddIncomeModal() {
  document.getElementById('ai-name').value    = '';
  document.getElementById('ai-planned').value = '';
  document.getElementById('ai-note').value    = '';
  Utils.openModal('addIncomeModal');
}

async function saveAddIncome() {
  const name    = document.getElementById('ai-name').value.trim();
  const planned = parseFloat(document.getElementById('ai-planned').value);
  const note    = document.getElementById('ai-note').value.trim();
  if (!name || isNaN(planned)) { Utils.showToast('Enter name and amount', 'error'); return; }
  const ok = await Storage.addIncomeSource(currentMonthKey, { name, planned, note });
  if (!ok) { Utils.showToast('Failed to add', 'error'); return; }
  Utils.closeModal('addIncomeModal');
  Utils.showToast('Income source added!');
  await renderPage();
}

// --- Expense Modal (mark paid) ---
function openExpenseModal(expId) {
  const m = _months[currentMonthKey];
  if (!m) return;
  const exp = (m.expenseItems || []).find(e => e.id === expId);
  if (!exp) return;
  currentExpenseId = expId;
  document.getElementById('em-title').textContent = exp.name;
  document.getElementById('em-planned').value = Utils.currency(exp.planned);
  document.getElementById('em-actual').value  = exp.actual || exp.planned || '';
  document.getElementById('em-date').value    = exp.date || new Date().toISOString().split('T')[0];
  document.getElementById('em-status').value  = exp.status === 'skipped' ? 'skipped' : 'paid';
  document.getElementById('em-note').value    = exp.note || '';
  Utils.openModal('expenseModal');
}

async function saveExpense() {
  const actual = parseFloat(document.getElementById('em-actual').value);
  if (isNaN(actual)) { Utils.showToast('Enter a valid amount', 'error'); return; }
  const ok = await Storage.saveExpenseItem(currentExpenseId, {
    actual,
    status: document.getElementById('em-status').value,
    date:   document.getElementById('em-date').value,
    note:   document.getElementById('em-note').value,
  });
  if (!ok) { Utils.showToast('Save failed', 'error'); return; }
  Utils.closeModal('expenseModal');
  Utils.showToast('Expense updated!');
  await renderPage();
}

// --- Add Expense Modal ---
function openAddExpenseModal() {
  document.getElementById('ae-name').value    = '';
  document.getElementById('ae-planned').value = '';
  document.getElementById('ae-note').value    = '';
  Utils.openModal('addExpenseModal');
}

async function saveAddExpense() {
  const name    = document.getElementById('ae-name').value.trim();
  const planned = parseFloat(document.getElementById('ae-planned').value);
  const note    = document.getElementById('ae-note').value.trim();
  if (!name || isNaN(planned)) { Utils.showToast('Enter name and amount', 'error'); return; }
  const ok = await Storage.addExpenseItem(currentMonthKey, { name, planned, note });
  if (!ok) { Utils.showToast('Failed to add', 'error'); return; }
  Utils.closeModal('addExpenseModal');
  Utils.showToast('Expense added!');
  await renderPage();
}

async function deleteIncomeSource(id) {
  if (!confirm('Remove this income source?')) return;
  await Storage.deleteExpenseItem(id);
  Utils.showToast('Income source removed');
  await renderPage();
}
