// loan.js - Loans page

let _loans = [];
let _editingLoanId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Storage.seedFromMasterData();
  await Theme.init();
  document.getElementById('navDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  await renderLoans();
});

async function renderLoans() {
  _loans = await Storage.getLoans();
  const el = document.getElementById('loanCards');
  if (!_loans.length) {
    el.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:60px 24px">
      <div style="font-size:48px;margin-bottom:16px">🏦</div>
      <h3 style="margin-bottom:8px">No loans yet</h3>
      <p style="color:var(--text-muted);margin-bottom:20px">Add your loans to track EMIs and progress.</p>
      <button class="btn btn-primary" onclick="openAddLoanModal()"><i class="fa-solid fa-plus"></i> Add Your First Loan</button>
    </div>`;
    return;
  }
  el.innerHTML = _loans.map(l => buildLoanCard(l)).join('');
}

function buildLoanCard(l) {
  const pct = l.principal ? Math.min(100, Math.round(((l.principal - l.outstanding) / l.principal) * 100)) : 0;
  const history = (l.paymentHistory || []).slice(-5).reverse();
  return `
    <div class="loan-card animate-in">
      <div class="loan-card-head">
        <div>
          <div class="loan-card-name">${l.name}</div>
          <div class="loan-card-bank"><i class="fa-solid fa-building-columns"></i> ${l.bank || '—'}</div>
        </div>
        <span class="card-badge badge-danger"><i class="fa-solid fa-percent"></i> ${l.interestRate || 0}%</span>
      </div>
      <div class="loan-card-body">
        <div class="loan-stats">
          <div class="loan-stat-item"><div class="loan-stat-label">Principal</div><div class="loan-stat-value">${Utils.currency(l.principal)}</div></div>
          <div class="loan-stat-item"><div class="loan-stat-label">Outstanding</div><div class="loan-stat-value" style="color:var(--accent-red)">${Utils.currency(l.outstanding)}</div></div>
          <div class="loan-stat-item"><div class="loan-stat-label">Monthly EMI</div><div class="loan-stat-value" style="color:var(--accent-blue)">${Utils.currency(l.emi)}</div></div>
          <div class="loan-stat-item"><div class="loan-stat-label">EMIs Paid</div><div class="loan-stat-value">${l.emisPaid || 0} / ${l.tenure || 0}</div></div>
          <div class="loan-stat-item"><div class="loan-stat-label">Remaining</div><div class="loan-stat-value">${l.emisRemaining || 0} EMIs</div></div>
          <div class="loan-stat-item"><div class="loan-stat-label">End Date</div><div class="loan-stat-value" style="font-size:12px">${Utils.shortDate(l.endDate)}</div></div>
        </div>
        <div class="progress-wrap">
          <div class="progress-label">
            <span><i class="fa-solid fa-circle-check" style="color:var(--accent-green)"></i> ${pct}% paid off</span>
            <span style="color:var(--accent-red)">${Utils.currency(l.outstanding)} remaining</span>
          </div>
          <div class="progress-bar" style="height:10px">
            <div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,#10b981,#3b82f6)"></div>
          </div>
        </div>
        ${history.length ? `
        <div style="margin-top:20px">
          <div style="font-size:13px;font-weight:600;margin-bottom:10px;color:var(--text-secondary)"><i class="fa-solid fa-clock-rotate-left"></i> Recent Payments</div>
          ${history.map(h => `
            <div class="history-item">
              <span class="history-date">${Utils.shortDate(h.date)}</span>
              <span class="history-name">${h.note || 'EMI Payment'}</span>
              <span class="history-amt" style="color:var(--accent-green)">${Utils.currency(h.amount)}</span>
            </div>`).join('')}
        </div>` : ''}
      </div>
      <div class="loan-card-foot">
        <div style="font-size:12px;color:var(--text-muted)">
          <i class="fa-solid fa-calendar-day"></i> Next EMI: ${Utils.shortDate(l.emiStartDate)} · ${Utils.currency(l.emi)}
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="openEditLoanModal('${l._supabaseId}')">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="btn btn-primary btn-sm" onclick="openEmiModal('${l._supabaseId}')">
            <i class="fa-solid fa-check"></i> Mark EMI Paid
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteLoan('${l._supabaseId}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>`;
}

// ─── EMI Modal ────────────────────────────────────────────────────────────
function openEmiModal(supabaseId) {
  const loan = _loans.find(l => l._supabaseId === supabaseId);
  if (!loan) return;
  loan._activeId = supabaseId;
  document.getElementById('emi-loan-name').value = loan.name;
  document.getElementById('emi-planned').value   = Utils.currency(loan.emi);
  document.getElementById('emi-actual').value    = loan.emi;
  document.getElementById('emi-date').value      = new Date().toISOString().split('T')[0];
  document.getElementById('emi-note').value      = '';
  document.getElementById('emi-save').onclick = () => saveEmiPayment(supabaseId);
  Utils.openModal('emiModal');
}

async function saveEmiPayment(supabaseId) {
  const loan = _loans.find(l => l._supabaseId === supabaseId);
  if (!loan) return;
  const amount = parseFloat(document.getElementById('emi-actual').value);
  if (isNaN(amount) || amount <= 0) { Utils.showToast('Enter a valid amount', 'error'); return; }
  const date = document.getElementById('emi-date').value;
  const note = document.getElementById('emi-note').value;
  const mi = (loan.interestRate || 0) / 100 / 12;
  const interestPart  = loan.outstanding * mi;
  const principalPart = Math.max(0, amount - interestPart);
  loan.outstanding    = Math.max(0, loan.outstanding - principalPart);
  loan.emisPaid       = (loan.emisPaid || 0) + 1;
  loan.emisRemaining  = Math.max(0, (loan.emisRemaining || 0) - 1);
  if (!loan.paymentHistory) loan.paymentHistory = [];
  loan.paymentHistory.push({ date, amount, note });
  const d = new Date(loan.emiStartDate || new Date());
  d.setMonth(d.getMonth() + 1);
  loan.emiStartDate = d.toISOString().split('T')[0];
  await Storage.saveLoan(loan);
  Utils.closeModal('emiModal');
  Utils.showToast('EMI payment recorded!');
  await renderLoans();
}

// ─── Add Loan Modal ───────────────────────────────────────────────────────
function openAddLoanModal() {
  _editingLoanId = null;
  document.getElementById('loan-modal-title').textContent = 'Add New Loan';
  ['al-name','al-bank','al-principal','al-outstanding','al-emi','al-rate','al-tenure','al-paid','al-start','al-end'].forEach(id => {
    document.getElementById(id).value = '';
  });
  Utils.openModal('addLoanModal');
}

function openEditLoanModal(supabaseId) {
  const loan = _loans.find(l => l._supabaseId === supabaseId);
  if (!loan) return;
  _editingLoanId = supabaseId;
  document.getElementById('loan-modal-title').textContent = 'Edit Loan';
  document.getElementById('al-name').value        = loan.name || '';
  document.getElementById('al-bank').value        = loan.bank || '';
  document.getElementById('al-principal').value   = loan.principal || '';
  document.getElementById('al-outstanding').value = loan.outstanding || '';
  document.getElementById('al-emi').value         = loan.emi || '';
  document.getElementById('al-rate').value        = loan.interestRate || '';
  document.getElementById('al-tenure').value      = loan.tenure || '';
  document.getElementById('al-paid').value        = loan.emisPaid || '';
  document.getElementById('al-start').value       = loan.emiStartDate || '';
  document.getElementById('al-end').value         = loan.endDate || '';
  Utils.openModal('addLoanModal');
}

async function saveLoanModal() {
  const name        = document.getElementById('al-name').value.trim();
  const bank        = document.getElementById('al-bank').value.trim();
  const principal   = parseFloat(document.getElementById('al-principal').value);
  const outstanding = parseFloat(document.getElementById('al-outstanding').value);
  const emi         = parseFloat(document.getElementById('al-emi').value);
  const rate        = parseFloat(document.getElementById('al-rate').value) || 0;
  const tenure      = parseInt(document.getElementById('al-tenure').value) || 0;
  const paid        = parseInt(document.getElementById('al-paid').value) || 0;
  const startDate   = document.getElementById('al-start').value;
  const endDate     = document.getElementById('al-end').value;

  if (!name || isNaN(principal) || isNaN(emi)) { Utils.showToast('Fill in required fields (Name, Principal, EMI)', 'error'); return; }

  if (_editingLoanId) {
    const loan = _loans.find(l => l._supabaseId === _editingLoanId);
    if (loan) {
      loan.name = name; loan.bank = bank; loan.principal = principal;
      loan.outstanding = isNaN(outstanding) ? loan.outstanding : outstanding;
      loan.emi = emi; loan.interestRate = rate; loan.tenure = tenure;
      loan.emisPaid = paid; loan.emisRemaining = tenure - paid;
      loan.emiStartDate = startDate; loan.endDate = endDate;
      await Storage.saveLoan(loan);
      Utils.showToast('Loan updated!');
    }
  } else {
    const loan = {
      id: 'loan_' + Date.now(), name, bank, principal,
      outstanding: isNaN(outstanding) ? principal : outstanding,
      emi, interestRate: rate, tenure, emisPaid: paid,
      emisRemaining: tenure - paid, startDate, endDate,
      emiStartDate: startDate, paymentHistory: []
    };
    await Storage.saveLoan(loan);
    Utils.showToast('Loan added!');
  }

  Utils.closeModal('addLoanModal');
  await renderLoans();
}

async function deleteLoan(supabaseId) {
  if (!confirm('Are you sure you want to delete this loan? This cannot be undone.')) return;
  await Storage.deleteLoan(supabaseId);
  Utils.showToast('Loan deleted');
  await renderLoans();
}
