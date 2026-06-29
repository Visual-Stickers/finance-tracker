// creditcard.js - Credit Cards page

let currentCardId = null;
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
  document.getElementById('navDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  document.getElementById('cc-save').addEventListener('click', saveNewCard);
  document.getElementById('pay-save').addEventListener('click', savePayment);
  await renderCards();
});

async function renderCards() {
  _cards = await Storage.getCreditCards();
  const el = document.getElementById('cardGrid');
  if (!_cards.length) {
    el.innerHTML = `
      <div class="card" style="grid-column:1/-1;text-align:center;padding:60px 24px">
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
  const grad = gradients[c.color] || gradients.blue;
  const utilPct = c.limit_amount ? Math.round(((c.outstanding||0) / c.limit_amount) * 100) : 0;
  const available = (c.limit_amount||0) - (c.outstanding||0);
  const utilColor = utilPct > 80 ? 'var(--accent-red)' : utilPct > 50 ? 'var(--accent-yellow)' : 'var(--accent-green)';
  return `
    <div class="card animate-in">
      <div class="cc-card-visual" style="background:${grad}">
        <div class="cc-card-name">${c.name}</div>
        <div style="margin:8px 0">
          <div style="font-size:11px;opacity:0.6;text-transform:uppercase;letter-spacing:0.06em">Credit Limit</div>
          <div class="cc-card-limit">${Utils.currency(c.limit_amount||0)}</div>
        </div>
        <div class="cc-card-footer">
          <div><div class="cc-card-label">Outstanding</div><div class="cc-card-val">${Utils.currency(c.outstanding||0)}</div></div>
          <div><div class="cc-card-label">Available</div><div class="cc-card-val">${Utils.currency(available)}</div></div>
          <div><div class="cc-card-label">Bank</div><div class="cc-card-val">${c.bank||'—'}</div></div>
        </div>
      </div>
      <div class="progress-wrap">
        <div class="progress-label">
          <span>Utilization: <strong style="color:${utilColor}">${utilPct}%</strong></span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${utilPct}%;background:${utilColor}"></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn btn-success btn-sm" onclick="openPayModal('${c.id}')">
          <i class="fa-solid fa-money-bill-wave"></i> Pay Now
        </button>
        <button class="btn btn-ghost btn-sm" onclick="deleteCard('${c.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

function openAddCardModal() {
  ['cc-name','cc-bank','cc-limit','cc-outstanding','cc-stmt-date','cc-due-date','cc-min-due'].forEach(id => {
    document.getElementById(id).value = '';
  });
  Utils.openModal('addCardModal');
}

async function saveNewCard() {
  const name        = document.getElementById('cc-name').value.trim();
  const bank        = document.getElementById('cc-bank').value.trim();
  const limit       = parseFloat(document.getElementById('cc-limit').value) || 0;
  const outstanding = parseFloat(document.getElementById('cc-outstanding').value) || 0;
  const dueDate     = document.getElementById('cc-due-date').value;
  const color       = document.getElementById('cc-color').value;
  if (!name) { Utils.showToast('Enter card name', 'error'); return; }
  await Storage.saveCreditCard({ name, bank, limit, outstanding, dueDate, color });
  Utils.closeModal('addCardModal');
  Utils.showToast('Card added!');
  await renderCards();
}

function openPayModal(cardId) {
  const card = _cards.find(c => c.id === cardId);
  if (!card) return;
  currentCardId = cardId;
  document.getElementById('pay-card-name').value   = card.name;
  document.getElementById('pay-outstanding').value = Utils.currency(card.outstanding||0);
  document.getElementById('pay-amount').value      = card.outstanding || '';
  document.getElementById('pay-date').value        = new Date().toISOString().split('T')[0];
  document.getElementById('pay-note').value        = '';
  Utils.openModal('payModal');
}

async function savePayment() {
  const card = _cards.find(c => c.id === currentCardId);
  if (!card) return;
  const amount = parseFloat(document.getElementById('pay-amount').value);
  if (isNaN(amount) || amount <= 0) { Utils.showToast('Enter a valid amount', 'error'); return; }
  card.outstanding = Math.max(0, (card.outstanding||0) - amount);
  await Storage.saveCreditCard(card);
  Utils.closeModal('payModal');
  Utils.showToast('Payment recorded!');
  await renderCards();
}

async function deleteCard(cardId) {
  if (!confirm('Remove this card?')) return;
  const sb = getSupabase();
  const user = await Auth.getUser();
  await sb.from('credit_cards').delete().eq('id', cardId).eq('user_id', user.id);
  Utils.showToast('Card removed');
  await renderCards();
}
