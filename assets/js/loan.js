// loan.js - Loans page logic

let currentLoanId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Storage.seedFromMasterData();
  document.getElementById('navDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  document.getElementById('emi-save').addEventListener('click', saveEmiPayment);
  document.getElementById('al-save').addEventListener('click', saveNewLoan);
  renderLoans();
});

function renderLoans() {
  const loans = Storage.getLoans();
  const el = document.getElementById('loanCards');

  if (!loans.length) {
    el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-landmark"></i><p>No loans yet. Click "Add Loan" to get started.</p></div>';
    return;
  }

  el.innerHTML = loans.map(l => buildLoanCard(l)).join('');
}

function buildLoanCard(l) {
  const paidPct = Math.min(100, Math.round(((l.principal - l.outstanding) / l.principal) * 100));
  const history = (l.paymentHistory || []).slice(-5).reverse();

  return `
    <div class="loan-card animate-in" id="lcard_${l.id}">
      <div class="loan-card-head">
        <div>
          <div class="loan-card-name">${l.name}</div>
          <div class="loan-card-bank"><i class="fa-solid fa-building-columns"></i> ${l.bank}</div>
        </div>
        <span class="card-badge badge-danger"><i class="fa-solid fa-percent"></i> ${l.interestRate}%</span>
      </div>

      <div class="loan-card-body">
        <div class="loan-stats">
          <div class="loan-stat-item">
            <div class="loan-stat-label">Principal</div>
            <div class="loan-stat-value">${Utils.currency(l.principal)}</div>
          </div>
          <div class="loan-stat-item">
            <div class="loan-stat-label">Outstanding</div>
            <div class="loan-stat-value" style="color:var(--accent-red)">${Utils.currency(l.outstanding)}</div>
          </div>
          <div class="loan-stat-item">
            <div class="loan-stat-label">Monthly EMI</div>
            <div class="loan-stat-value" style="color:var(--accent-blue)">${Utils.currency(l.emi)}</div>
          </div>
          <div class="loan-stat-item">
            <div class="loan-stat-label">EMIs Paid</div>
            <div class="loan-stat-value">${l.emisPaid} / ${l.tenure}</div>
          </div>
          <div class="loan-stat-item">
            <div class="loan-stat-label">Remaining</div>
            <div class="loan-stat-value">${l.emisRemaining} EMIs</div>
          </div>
          <div class="loan-stat-item">
            <div class="loan-stat-label">End Date</div>
            <div class="loan-stat-value" style="font-size:12px">${Utils.shortDate(l.endDate)}</div>
          </div>
        </div>

        <div class="progress-wrap">
          <div class="progress-label">
            <span><i class="fa-solid fa-circle-check" style="color:var(--accent-green)"></i> ${paidPct}% paid off</span>
            <span style="color:var(--accent-red)">${Utils.currency(l.outstanding)} remaining</span>
          </div>
          <div class="progress-bar" style="height:10px">
            <div class="progress-fill" style="width:${paidPct}%;background:linear-gradient(90deg,#10b981,#3b82f6)"></div>
          </div>
        </div>

        ${history.length ? `
        <div style="margin-top:20px">
          <div class="section-title" style="font-size:13px;margin-bottom:10px"><i class="fa-solid fa-clock-rotate-left"></i> Recent Payments</div>
          ${history.map(h => `
            <div class="history-item">
              <span class="history-date">${Utils.shortDate(h.date)}</span>
              <span class="history-name">${h.note || 'EMI Payment'}</span>
              <span class="history-amt" style="color:var(--accent-green)">${Utils.currency(h.amount)}</span>
              <span class="history-status"><span class="status-pill status-success">Paid</span></span>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>

      <div class="loan-card-foot">
        <div style="font-size:12px;color:var(--text-muted)">
          <i class="fa-solid fa-calendar-day"></i> Next EMI: ${Utils.shortDate(l.emiStartDate)} · ${Utils.currency(l.emi)}
        </div>
        <button class="btn btn-primary btn-sm" onclick="openEmiModal('${l.id}')">
          <i class="fa-solid fa-check"></i> Mark EMI Paid
        </button>
      </div>
    </div>
  `;
}

function openEmiModal(loanId) {
  const loans = Storage.getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return;
  currentLoanId = loanId;
  document.getElementById('emi-loan-name').value = loan.name;
  document.getElementById('emi-planned').value   = Utils.currency(loan.emi);
  document.getElementById('emi-actual').value    = loan.emi;
  document.getElementById('emi-date').value      = new Date().toISOString().split('T')[0];
  document.getElementById('emi-note').value      = '';
  Utils.openModal('emiModal');
}

function saveEmiPayment() {
  const loans = Storage.getLoans();
  const loan = loans.find(l => l.id === currentLoanId);
  if (!loan) return;

  const amount = parseFloat(document.getElementById('emi-actual').value);
  if (isNaN(amount) || amount <= 0) { Utils.showToast('Enter a valid amount', 'error'); return; }

  const date = document.getElementById('emi-date').value;
  const note = document.getElementById('emi-note').value;

  // Update loan data
  loan.outstanding = Math.max(0, loan.outstanding - (amount * 0.85)); // approx principal portion
  loan.emisPaid    += 1;
  loan.emisRemaining = Math.max(0, loan.emisRemaining - 1);
  if (!loan.paymentHistory) loan.paymentHistory = [];
  loan.paymentHistory.push({ date, amount, note });

  // Advance next EMI date by ~1 month
  const d = new Date(loan.emiStartDate);
  d.setMonth(d.getMonth() + 1);
  loan.emiStartDate = d.toISOString().split('T')[0];

  Storage.saveLoans(loans);
  Utils.closeModal('emiModal');
  Utils.showToast('EMI payment recorded!');
  renderLoans();
}

function openAddLoanModal() {
  ['al-name','al-bank','al-principal','al-outstanding','al-emi','al-rate','al-tenure','al-paid','al-start','al-end'].forEach(id => {
    document.getElementById(id).value = '';
  });
  Utils.openModal('addLoanModal');
}

function saveNewLoan() {
  const name        = document.getElementById('al-name').value.trim();
  const bank        = document.getElementById('al-bank').value.trim();
  const principal   = parseFloat(document.getElementById('al-principal').value);
  const outstanding = parseFloat(document.getElementById('al-outstanding').value);
  const emi         = parseFloat(document.getElementById('al-emi').value);
  const rate        = parseFloat(document.getElementById('al-rate').value);
  const tenure      = parseInt(document.getElementById('al-tenure').value);
  const paid        = parseInt(document.getElementById('al-paid').value) || 0;
  const startDate   = document.getElementById('al-start').value;
  const endDate     = document.getElementById('al-end').value;

  if (!name || isNaN(principal) || isNaN(emi)) { Utils.showToast('Fill in required fields', 'error'); return; }

  const loans = Storage.getLoans();
  loans.push({
    id: 'loan_' + Date.now(),
    name, bank, principal, outstanding: outstanding || principal,
    emi, interestRate: rate || 0, tenure: tenure || 0,
    emisPaid: paid, emisRemaining: (tenure || 0) - paid,
    startDate, endDate, emiStartDate: startDate,
    paymentHistory: []
  });
  Storage.saveLoans(loans);
  Utils.closeModal('addLoanModal');
  Utils.showToast('Loan added!');
  renderLoans();
}
