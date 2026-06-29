// creditcard.js - Credit Cards page

let _cards = [];
const gradients = {
  blue:   'linear-gradient(135deg,#1d4ed8,#3b82f6)',
  teal:   'linear-gradient(135deg,#0e7490,#06b6d4)',
  purple: 'linear-gradient(135deg,#5b21b6,#8b5cf6)',
  red:    'linear-gradient(135deg,#991b1b,#ef4444)',
  green:  'linear-gradient(135deg,#065f46,#10b981)',
  orange: 'linear-gradient(135deg,#c2410c,#f97316)',
};

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireAuth();
  if (!user) return;
  await Storage.seedFromMasterData();
  await Theme.init();
  document.getElementById('navDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  await renderCards();
});

async function renderCards() {
  _cards = await Storage.getCreditCards();
  const el = document.getElementById('cardGrid');
  if (!_cards.length) {
    el.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:60px 24px">
      <div style="font-size:48px;margin-bottom:16px">💳</div>
      <h3 style="margin-bottom:8px">No credit cards yet</h3>
      <p style="color:var(--text-muted);margin-bottom:20px">Add your credit cards to track balances and payments.</p>
      <button class="btn btn-primary" onclick="openAddCardModal()"><i class="fa-solid fa-plus"></i> Add Your First Card</button>
    </div>`;
    return;
  }
  el.innerHTML = _cards.map(c => buildCardEl(c)).join('');
}

function buildCardEl(c) {
  const grad     = gradients[c.color] || gradients.blue;
  const utilPct  = c.limit ? Math.min(100, Math.round(((c.outstanding||0) / c.limit) * 100)) : 0;
  const available = Math.max(0, (c.limit||0) - (c.outstanding||0));
  const utilColor = utilPct > 80 ? 'var(--accent-red)' : utilPct > 50 ? 'var(--accent-yellow)' : 'var(--accent-green)';
  return `
    <div class="card animate-in">
      <div class="cc-card-visual" style="background:${grad}">
        <div class="cc-card-name">${c.name}</div>
        <div style="margin:8px 0">
          <div style="font-size:11px;opacity:0.6;text-transform:uppercase;letter-spacing:0.06em">Credit Limit</div>
          <div class="cc-card-limit">${Utils.currency(c.limit||0)}</div>
        </div>
        <div class="cc-card-footer">
          <div><div class="cc-card-label">Outstanding</div><div class="cc-card-val">${Utils.currency(c.outstanding||0)}</div></div>
          <div><div class="cc-card-label">Available</div><div class="cc-card-val">${Utils.currency(available)}</div></div>
          <div><div class="cc-card-label">Bank</div><div class="cc-card-val">${c.bank||'—'}</div></div>
        </div>
      </div>
      <div class="progress-wrap" style="margin-top:12px">
        <div class="progress-label">
          <span>Utilization: <strong style="color:${utilColor}">${utilPct}%</strong></span>
          ${c.dueDate ? `<span style="color:var(--text-muted);font-size:12px">Due: ${Utils.shortDate(c.dueDate)}</span>` : ''}
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${utilPct}%;background:${utilColor}"></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn btn-success btn-sm" onclick="openPayModal('${c.id}')">
          <i class="fa-solid fa-money-bill-wave"></i> Pay Now
        </button>
        <button class="btn btn-ghost btn-sm" onclick="openEditCardModal('${c.id}')">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteCard('${c.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`;
}

// ─── Add Card Modal ───────────────────────────────────────────────────────
function openAddCardModal() {
  document.getElementById('cc-modal-title').textContent = 'Add Credit Card';
  ['cc-name','cc-bank','cc-limit','cc-outstanding','cc-due-date'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('cc-color').value = 'blue';
  document.getElementById('cc-card-id').value = '';
  Utils.openModal('addCardModal');
}

function openEditCardModal(cardId) {
  const card = _cards.find(c => c.id === cardId);
  if (!card) return;
  document.getElementById('cc-modal-title').textContent = 'Edit Credit Card';
  document.getElementById('cc-card-id').value   = card.id;
  document.getElementById('cc-name').value       = card.name || '';
  document.getElementById('cc-bank').value       = card.bank || '';
  document.getElementById('cc-limit').value      = card.limit || '';
  document.getElementById('cc-outstanding').value = card.outstanding || '';
  document.getElementById('cc-due-date').value   = card.dueDate || '';
  document.getElementById('cc-color').value      = card.color || 'blue';
  Utils.openModal('addCardModal');
}

async function saveCard() {
  const name        = document.getElementById('cc-name').value.trim();
  const bank        = document.getElementById('cc-bank').value.trim();
  const limit       = parseFloat(document.getElementById('cc-limit').value) || 0;
  const outstanding = parseFloat(document.getElementById('cc-outstanding').value) || 0;
  const dueDate     = document.getElementById('cc-due-date').value;
  const color       = document.getElementById('cc-color').value || 'blue';
  const existingId  = document.getElementById('cc-card-id').value;

  if (!name) { Utils.showToast('Enter card name', 'error'); return; }

  const ok = await Storage.saveCreditCard({ id: existingId || null, name, bank, limit, outstanding, dueDate, color });
  if (!ok) { Utils.showToast('Failed to save card', 'error'); return; }
  Utils.closeModal('addCardModal');
  Utils.showToast(existingId ? 'Card updated!' : 'Card added!');
  await renderCards();
}

// ─── Pay Modal ────────────────────────────────────────────────────────────
function openPayModal(cardId) {
  const card = _cards.find(c => c.id === cardId);
  if (!card) return;
  document.getElementById('pay-card-name').value   = card.name;
  document.getElementById('pay-outstanding').value = Utils.currency(card.outstanding||0);
  document.getElementById('pay-amount').value      = card.outstanding || '';
  document.getElementById('pay-date').value        = new Date().toISOString().split('T')[0];
  document.getElementById('pay-note').value        = '';
  document.getElementById('pay-save').onclick      = () => savePayment(cardId);
  Utils.openModal('payModal');
}

async function savePayment(cardId) {
  const card = _cards.find(c => c.id === cardId);
  if (!card) return;
  const amount = parseFloat(document.getElementById('pay-amount').value);
  if (isNaN(amount) || amount <= 0) { Utils.showToast('Enter a valid amount', 'error'); return; }
  card.outstanding = Math.max(0, (card.outstanding||0) - amount);
  const ok = await Storage.saveCreditCard(card);
  if (!ok) { Utils.showToast('Failed to save payment', 'error'); return; }
  Utils.closeModal('payModal');
  Utils.showToast('Payment recorded!');
  await renderCards();
}

async function deleteCard(cardId) {
  if (!confirm('Remove this card? This cannot be undone.')) return;
  await Storage.deleteCreditCard(cardId);
  Utils.showToast('Card removed');
  await renderCards();
}
