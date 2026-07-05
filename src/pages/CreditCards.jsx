import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import * as api from '../lib/api';
import { onDataChanged } from '../lib/dataSync';
import { currency, shortDate } from '../lib/utils';
import Modal from '../components/Modal';

const GRADIENTS = [
  'linear-gradient(135deg,#1558d6,#2979ff)',
  'linear-gradient(135deg,#5b21b6,#8b5cf6)',
  'linear-gradient(135deg,#065f46,#10b981)',
  'linear-gradient(135deg,#b91c1c,#f85149)',
  'linear-gradient(135deg,#c2410c,#f97316)',
  'linear-gradient(135deg,#0e7490,#06b6d4)',
];

export default function CreditCards() {
  const { user } = useAuth();
  const toast = useToast();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payCard, setPayCard] = useState(null);

  async function load() {
    setCards(await api.getCards(user.id));
    setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onDataChanged(load), []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalOS = cards.reduce((s, c) => s + Number(c.outstanding || 0), 0);
  const totalLim = cards.reduce((s, c) => s + Number(c.limit || 0), 0);
  const totalAvail = Math.max(0, totalLim - totalOS);
  const util = totalLim > 0 ? Math.round((totalOS / totalLim) * 100) : 0;
  const utilColor = util > 80 ? 'var(--red)' : util > 50 ? 'var(--yellow)' : 'var(--green)';

  async function deleteCard(id) {
    if (!confirm('Delete this card permanently?')) return;
    await api.deleteCard(user.id, id);
    toast('Card removed');
    load();
  }

  if (loading) return <div className="text-text2 text-sm">Loading…</div>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><i className="fa fa-credit-card text-orange" /> Credit Cards</h1>
          <p className="text-text2 text-sm">Track your credit card balances, utilization and payments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingCard(null); setModalOpen(true); }}><i className="fa fa-plus" /> Add Card</button>
      </div>

      {cards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="card card-sm" style={{ borderTop: '3px solid var(--orange)' }}><div className="text-[11px] uppercase text-text3 font-bold">Total Outstanding</div><div className="text-lg font-extrabold text-orange">{currency(totalOS)}</div></div>
          <div className="card card-sm" style={{ borderTop: '3px solid var(--blue)' }}><div className="text-[11px] uppercase text-text3 font-bold">Total Credit Limit</div><div className="text-lg font-extrabold text-blue">{currency(totalLim)}</div></div>
          <div className="card card-sm" style={{ borderTop: '3px solid var(--green)' }}><div className="text-[11px] uppercase text-text3 font-bold">Total Available</div><div className="text-lg font-extrabold text-green">{currency(totalAvail)}</div></div>
          <div className="card card-sm" style={{ borderTop: '3px solid var(--yellow)' }}><div className="text-[11px] uppercase text-text3 font-bold">Overall Utilization</div><div className="text-lg font-extrabold" style={{ color: utilColor }}>{util}%</div></div>
        </div>
      )}

      {!cards.length ? (
        <div className="card text-center py-16 px-6">
          <div className="text-5xl mb-4">💳</div>
          <h3 className="font-bold text-lg mb-2">No credit cards yet</h3>
          <p className="text-text2 mb-5">Add your credit cards to track balances, utilization and payments.</p>
          <button className="btn btn-primary" onClick={() => { setEditingCard(null); setModalOpen(true); }}><i className="fa fa-plus" /> Add Your First Card</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {cards.map((c, i) => (
            <CardTile
              key={c.id} c={c} idx={i}
              onEdit={() => { setEditingCard(c); setModalOpen(true); }}
              onPay={() => { setPayCard(c); setPayOpen(true); }}
              onDelete={() => deleteCard(c.id)}
            />
          ))}
        </div>
      )}

      <CardModal open={modalOpen} onClose={() => setModalOpen(false)} card={editingCard} userId={user.id} toast={toast} onSaved={load} />
      <PayModal open={payOpen} onClose={() => setPayOpen(false)} card={payCard} userId={user.id} toast={toast} onSaved={load} />
    </div>
  );
}

function CardTile({ c, idx, onEdit, onPay, onDelete }) {
  const grad = GRADIENTS[idx % GRADIENTS.length];
  const util = c.limit ? Math.min(100, Math.round((c.outstanding / c.limit) * 100)) : 0;
  const avail = Math.max(0, (c.limit || 0) - (c.outstanding || 0));
  const utilColor = util > 80 ? '#f85149' : util > 50 ? '#d29922' : '#3fb950';
  const dueDate = c.dueDate ? new Date(c.dueDate) : null;
  const daysUntilDue = dueDate ? Math.ceil((dueDate - new Date()) / 86400000) : null;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-5 text-white relative" style={{ background: grad }}>
        <div className="w-9 h-6 rounded bg-white/25 mb-4" />
        <div className="font-bold text-base mb-2 flex items-center gap-2 flex-wrap">
          {c.name}
          {daysUntilDue != null && daysUntilDue <= 7 && <span className="badge bg-white/20 text-white"><i className="fa fa-exclamation" /> Due in {daysUntilDue}d</span>}
        </div>
        <div className="text-xs opacity-80 mb-1">Credit Limit</div>
        <div className="text-xl font-extrabold mb-3">{currency(c.limit || 0)}</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><div className="opacity-70">Outstanding</div><div className="font-bold">{currency(c.outstanding || 0)}</div></div>
          <div><div className="opacity-70">Available</div><div className="font-bold">{currency(avail)}</div></div>
          <div><div className="opacity-70">Bank</div><div className="font-bold truncate">{c.bank || '—'}</div></div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap justify-between text-xs mb-1.5 gap-1">
          <span className="text-text2">Utilization: <strong style={{ color: utilColor }}>{util}%</strong> {util > 80 ? <span className="text-red"> ⚠️ High</span> : util > 50 ? <span className="text-yellow"> ⚠️ Moderate</span> : <span className="text-green"> ✓ Healthy</span>}</span>
          {c.dueDate && <span className="text-text3">Due: {shortDate(c.dueDate)}</span>}
        </div>
        <div className="progress-bar h-1.5 mb-3"><div className="progress-fill h-full" style={{ width: `${util}%`, background: utilColor }} /></div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-success btn-sm" onClick={onPay}><i className="fa fa-money-bill-wave" /> Pay Now</button>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}><i className="fa fa-pen" /> Edit</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}><i className="fa fa-trash" /></button>
        </div>
      </div>
    </div>
  );
}

function CardModal({ open, onClose, card, userId, toast, onSaved }) {
  const [f, setF] = useState({});
  useEffect(() => {
    if (!open) return;
    setF({ name: card?.name || '', bank: card?.bank || '', limit: card?.limit || '', outstanding: card?.outstanding || '', due: card?.dueDate || '' });
  }, [open, card]);
  function set(k, v) { setF((p) => ({ ...p, [k]: v })); }

  async function save() {
    const name = (f.name || '').trim();
    if (!name) { toast('Card name is required', 'error'); return; }
    const payload = { id: card?.id || null, name, bank: (f.bank || '').trim(), limit: parseFloat(f.limit) || 0, outstanding: parseFloat(f.outstanding) || 0, dueDate: f.due || null };
    const ok = await api.saveCard(userId, payload);
    if (!ok) { toast('Failed to save card', 'error'); return; }
    toast(card ? 'Card updated!' : 'Card added!');
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={card ? 'Edit Card' : 'Add Credit Card'} icon={<i className={`fa ${card ? 'fa-pen' : 'fa-credit-card'} text-blue`} />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}><i className="fa fa-check" /> Save Card</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group"><label className="form-label">Card Name *</label><input className="form-control" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. HDFC Millennia" /></div>
        <div className="form-group"><label className="form-label">Bank</label><input className="form-control" value={f.bank || ''} onChange={(e) => set('bank', e.target.value)} placeholder="e.g. HDFC Bank" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group"><label className="form-label">Credit Limit (₹)</label><input className="form-control" type="number" value={f.limit || ''} onChange={(e) => set('limit', e.target.value)} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">Current Outstanding (₹)</label><input className="form-control" type="number" value={f.outstanding || ''} onChange={(e) => set('outstanding', e.target.value)} placeholder="0" /></div>
      </div>
      <div className="form-group"><label className="form-label">Payment Due Date</label><input className="form-control" type="date" value={f.due || ''} onChange={(e) => set('due', e.target.value)} /></div>
    </Modal>
  );
}

function PayModal({ open, onClose, card, userId, toast, onSaved }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  useEffect(() => {
    if (!open || !card) return;
    setAmount(String(card.outstanding || ''));
    setDate(new Date().toISOString().split('T')[0]);
  }, [open, card]);
  if (!card) return null;

  async function save() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast('Enter a valid amount', 'error'); return; }
    const ok = await api.payCard(userId, card, { amount: amt, date });
    if (!ok) { toast('Failed to record payment', 'error'); return; }
    toast('Payment recorded!');
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Pay — ${card.name}`} icon={<i className="fa fa-money-bill-wave text-green" />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-success" onClick={save}><i className="fa fa-check" /> Confirm Payment</button></>}>
      <div className="form-group"><label className="form-label">Current Outstanding</label><input className="form-control" readOnly value={currency(card.outstanding || 0)} /></div>
      <div className="form-group"><label className="form-label">Payment Amount (₹) *</label><input className="form-control" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" /></div>
      <div className="form-group"><label className="form-label">Payment Date</label><input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
    </Modal>
  );
}
