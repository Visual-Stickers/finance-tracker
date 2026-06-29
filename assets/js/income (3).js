// income.js - Income & Expense page logic

let currentMonthKey = Utils.monthKey(new Date());
let currentExpenseId = null;
let _months = {}; // local cache
let _pickerYear = new Date().getFullYear();
let _excelData = null; // pending excel import

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Storage.seedFromMasterData();
  document.getElementById('navDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  document.getElementById('prevMonth').addEventListener('click', () => shiftMonth(-1));
  document.getElementById('nextMonth').addEventListener('click', () => shiftMonth(1));
  document.getElementById('im-save').addEventListener('click', saveIncome);
  document.getElementById('em-save').addEventListener('click', saveExpense);
  // Pre-fill new month year
  document.getElementById('nm-year').value = new Date().getFullYear();
  await renderPage();
});

async function shiftMonth(dir) {
  const [y, m] = currentMonthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  currentMonthKey = Utils.monthKey(d);
  await renderPage();
}

// ─── Month Picker ─────────────────────────────────────────────────────────
function openMonthPicker() {
  const [y] = currentMonthKey.split('-').map(Number);
  _pickerYear = y;
  renderPickerGrid();
  document.getElementById('monthPicker').style.display = 'block';
  document.getElementById('monthPickerOverlay').style.display = 'block';
}

function closeMonthPicker() {
  document.getElementById('monthPicker').style.display = 'none';
  document.getElementById('monthPickerOverlay').style.display = 'none';
}

function shiftPickerYear(dir) {
  _pickerYear += dir;
  renderPickerGrid();
}

function renderPickerGrid() {
  document.getElementById('pickerYear').textContent = _pickerYear;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [cy, cm] = currentMonthKey.split('-').map(Number);
  document.getElementById('pickerGrid').innerHTML = months.map((name, i) => {
    const mk = `${_pickerYear}-${String(i+1).padStart(2,'0')}`;
    const hasData = !!_months[mk];
    const isActive = (_pickerYear === cy && i+1 === cm);
    return `<button class="picker-month-btn ${isActive ? 'active' : ''} ${hasData ? 'has-data' : ''}"
      onclick="jumpToMonth('${mk}')">${name}</button>`;
  }).join('');
}

async function jumpToMonth(mk) {
  currentMonthKey = mk;
  closeMonthPicker();
  await renderPage();
}

// ─── New Month ────────────────────────────────────────────────────────────
function openNewMonthModal() {
  const [y, m] = currentMonthKey.split('-').map(Number);
  // Default to next month
  const next = new Date(y, m, 1);
  document.getElementById('nm-year').value = next.getFullYear();
  document.getElementById('nm-month').value = String(next.getMonth()+1).padStart(2,'0');
  document.getElementById('nm-income').value = '';
  Utils.openModal('newMonthModal');
}

async function saveNewMonth() {
  const year   = document.getElementById('nm-year').value;
  const month  = document.getElementById('nm-month').value;
  const income = parseFloat(document.getElementById('nm-income').value) || 0;
  if (!year || !month) { Utils.showToast('Select year and month', 'error'); return; }
  const monthKey = `${year}-${month}`;
  const d = new Date(parseInt(year), parseInt(month)-1, 1);
  const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const ok = await Storage.addMonth(monthKey, { income, label });
  if (!ok) { Utils.showToast('Failed to create month', 'error'); return; }
  Utils.closeModal('newMonthModal');
  Utils.showToast(`${label} created!`);
  currentMonthKey = monthKey;
  await renderPage();
}

// ─── Excel Import ─────────────────────────────────────────────────────────
function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      parseExcelRows(rows, file.name);
    } catch(err) {
      Utils.showToast('Failed to read Excel file', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = ''; // reset input
}

function parseExcelRows(rows, filename) {
  // Expected format: Row 1 = headers, Col A = Name, Col B = Planned Amount, Col C = Type (income/expense)
  // Or: Row 1 = Month (e.g. "Jan 2028"), remaining rows = Name | Amount | Type
  if (!rows || rows.length < 2) { Utils.showToast('Excel file is empty or invalid', 'error'); return; }

  let monthKey = currentMonthKey;
  let startRow = 1;
  let incomeItems = [], expenseItems = [];

  // Check if first row looks like a month label
  const firstCell = String(rows[0][0] || '').trim();
  const monthMatch = firstCell.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthMatch) {
    const d = new Date(`${monthMatch[1]} 1 ${monthMatch[2]}`);
    if (!isNaN(d)) {
      monthKey = Utils.monthKey(d);
      startRow = 1;
    }
  }

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const name    = String(row[0]).trim();
    const amount  = parseFloat(row[1]) || 0;
    const type    = String(row[2] || 'expense').toLowerCase().trim();
    if (!name || !amount) continue;
    if (type === 'income') {
      incomeItems.push({ name, amount });
    } else {
      expenseItems.push({ name, amount });
    }
  }

  _excelData = { monthKey, incomeItems, expenseItems };

  // Show preview
  const d = new Date(monthKey + '-01');
  const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  let previewHtml = `<div style="margin-bottom:12px;font-weight:600;color:var(--text-primary)">Month: ${label}</div>`;

  if (incomeItems.length) {
    previewHtml += `<div style="font-size:12px;font-weight:600;color:var(--accent-green);margin-bottom:6px">INCOME</div>`;
    previewHtml += incomeItems.map(i => `
      <div class="history-item">
        <span class="history-name">${i.name}</span>
        <span class="history-amt" style="color:var(--accent-green)">${Utils.currency(i.amount)}</span>
      </div>`).join('');
  }

  if (expenseItems.length) {
    previewHtml += `<div style="font-size:12px;font-weight:600;color:var(--accent-red);margin-top:12px;margin-bottom:6px">EXPENSES</div>`;
    previewHtml += expenseItems.map(e => `
      <div class="history-item">
        <span class="history-name">${e.name}</span>
        <span class="history-amt" style="color:var(--accent-red)">${Utils.currency(e.amount)}</span>
      </div>`).join('');
  }

  if (!incomeItems.length && !expenseItems.length) {
    Utils.showToast('No valid data found in Excel file', 'error');
    return;
  }

  document.getElementById('excelPreviewContent').innerHTML = previewHtml;
  Utils.openModal('excelPreviewModal');
}

async function confirmExcelImport() {
  if (!_excelData) return;
  const { monthKey, incomeItems, expenseItems } = _excelData;
  const d = new Date(monthKey + '-01');
  const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  // Create month if needed
  await Storage.addMonth(monthKey, { income: incomeItems.reduce((s,i) => s+i.amount, 0), label });

  // Add income sources
  for (const item of incomeItems) {
    await Storage.addIncomeSource(monthKey, { name: item.name, planned: item.amount, note: '' });
  }

  // Add expenses
  for (const item of expenseItems) {
    await Storage.addExpenseItem(monthKey, { name: item.name, planned: item.amount, note: '' });
  }

  Utils.closeModal('excelPreviewModal');
  Utils.showToast(`${label} imported successfully!`);
  currentMonthKey = monthKey;
  _excelData = null;
  await renderPage();
}

async function renderPage() {
  document.getElementById('monthLabel').textContent = Utils.monthLabel(currentMonthKey);
  _months = await Storage.getMonths();
  const m = _months[currentMonthKey];

  if (!m) {
    const emptyHtml = `
      <div class="empty-state" style="padding:24px 0">
        <i class="fa-solid fa-calendar-xmark" style="font-size:28px;margin-bottom:12px;opacity:0.4"></i>
        <p style="margin-bottom:16px">No data for this month</p>
        <button class="btn btn-primary btn-sm" onclick="openNewMonthModal()">
          <i class="fa-solid fa-plus"></i> Create This Month
        </button>
      </div>`;
    document.getElementById('incomeList').innerHTML = emptyHtml;
    document.getElementById('expenseList').innerHTML = `
      <div style="padding:10px 0 4px">
        <button class="btn btn-ghost btn-sm" onclick="openAddExpenseModal()" style="width:100%;border:1px dashed var(--border);color:var(--accent-red)">
          <i class="fa-solid fa-plus"></i> Add Expense
        </button>
      </div>`;
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
        <div class="ie-item-action" style="display:flex;gap:4px">
          ${e.status !== 'paid'
            ? `<button class="btn btn-primary btn-sm" onclick="openExpenseModal('${e.id}')"><i class="fa-solid fa-check"></i> Mark</button>`
            : `<button class="btn btn-ghost btn-sm" onclick="openExpenseModal('${e.id}')"><i class="fa-solid fa-pen"></i></button>`
          }
          <button class="btn btn-ghost btn-sm" onclick="deleteExpenseItem('${e.id}')" title="Delete">
            <i class="fa-solid fa-trash" style="color:var(--accent-red)"></i>
          </button>
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

async function deleteExpenseItem(id) {
  if (!confirm('Remove this expense?')) return;
  await Storage.deleteExpenseItem(id);
  Utils.showToast('Expense removed');
  await renderPage();
}
