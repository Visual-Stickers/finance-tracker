import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import * as api from '../lib/api';
import { onDataChanged } from '../lib/dataSync';
import { currency, shortDate } from '../lib/utils';
import Modal from '../components/Modal';

export default function Loans() {
  const { user } = useAuth();
  const toast = useToast();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [emiOpen, setEmiOpen] = useState(false);
  const [emiLoan, setEmiLoan] = useState(null);

  async function load() {
    setLoans(await api.getLoans(user.id));
    setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onDataChanged(load), []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalOS = loans.reduce((s, l) => s + Number(l.outstanding || 0), 0);
  const totalEmi = loans.reduce((s, l) => s + Number(l.emi || 0), 0);
  const totalInterest = loans.reduce((s, l) => s + Math.max(0, l.emi * l.tenure - l.principal), 0);
  const avgRate = loans.length ? loans.reduce((s, l) => s + Number(l.interestRate || 0), 0) / loans.length : 0;

  async function deleteLoan(id) {
    if (!confirm('Delete this loan permanently? This cannot be undone.')) return;
    await api.deleteLoan(user.id, id);
    toast('Loan deleted');
    load();
  }

  if (loading) return <div className="text-text2 text-sm">Loading…</div>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><i className="fa fa-landmark text-red" /> Loans</h1>
          <p className="text-text2 text-sm">Track your loan EMIs and repayment progress.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingLoan(null); setModalOpen(true); }}><i className="fa fa-plus" /> Add Loan</button>
      </div>

      {loans.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="card card-sm" style={{ borderTop: '3px solid var(--red)' }}><div className="text-[11px] uppercase text-text3 font-bold">Total Outstanding</div><div className="text-lg font-extrabold text-red">{currency(totalOS)}</div></div>
          <div className="card card-sm" style={{ borderTop: '3px solid var(--blue)' }}><div className="text-[11px] uppercase text-text3 font-bold">Monthly EMI Burden</div><div className="text-lg font-extrabold text-blue">{currency(totalEmi)}</div></div>
          <div className="card card-sm" style={{ borderTop: '3px solid var(--yellow)' }}><div className="text-[11px] uppercase text-text3 font-bold">Total Interest Payable</div><div className="text-lg font-extrabold text-yellow">{currency(totalInterest)}</div></div>
          <div className="card card-sm" style={{ borderTop: '3px solid var(--green)' }}><div className="text-[11px] uppercase text-text3 font-bold">Avg Interest Rate</div><div className="text-lg font-extrabold text-green">{avgRate.toFixed(2)}%</div></div>
        </div>
      )}

      {!loans.length ? (
        <div className="card text-center py-16 px-6">
          <div className="text-5xl mb-4">🏦</div>
          <h3 className="font-bold text-lg mb-2">No loans yet</h3>
          <p className="text-text2 mb-5">Add a loan to track EMIs and repayment progress.</p>
          <button className="btn btn-primary" onClick={() => { setEditingLoan(null); setModalOpen(true); }}><i className="fa fa-plus" /> Add Your First Loan</button>
        </div>
      ) : (
        loans.map((l) => (
          <LoanCard
            key={l._id} l={l}
            onEdit={() => { setEditingLoan(l); setModalOpen(true); }}
            onEmi={() => { setEmiLoan(l); setEmiOpen(true); }}
            onDelete={() => deleteLoan(l._id)}
          />
        ))
      )}

      <LoanModal open={modalOpen} onClose={() => setModalOpen(false)} loan={editingLoan} userId={user.id} toast={toast} onSaved={load} />
      <EmiModal open={emiOpen} onClose={() => setEmiOpen(false)} loan={emiLoan} userId={user.id} toast={toast} onSaved={load} />
    </div>
  );
}

function LoanCard({ l, onEdit, onEmi, onDelete }) {
  const pct = l.principal ? Math.min(100, Math.round(((l.principal - l.outstanding) / l.principal) * 100)) : 0;
  const remAmt = (l.emi || 0) * (l.emisRemaining || 0);
  const totalInterest = l.emi * l.tenure - l.principal;
  const intPaid = totalInterest > 0 ? totalInterest * (pct / 100) : 0;
  const hist = (l.paymentHistory || []).slice(-5).reverse();

  return (
    <div className="card p-0 mb-4 overflow-hidden">
      <div className="p-5 border-b border-border flex flex-wrap justify-between gap-4">
        <div>
          <div className="font-bold text-base">{l.name}</div>
          <div className="text-xs text-text2 mt-1">{l.bank}</div>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
          <div><div className="text-[10px] uppercase text-text3 font-bold mb-1">EMI</div><div className="text-sm font-bold">{currency(l.emi)}</div></div>
          <div><div className="text-[10px] uppercase text-text3 font-bold mb-1">Rate</div><div className="text-sm font-bold">{l.interestRate}%</div></div>
          <div><div className="text-[10px] uppercase text-text3 font-bold mb-1">End Date</div><div className="text-sm font-bold">{shortDate(l.endDate)}</div></div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-green font-bold">{pct}% paid off · {currency(l.principal - l.outstanding)} repaid</span>
          <span className="text-text2">{currency(l.outstanding)} remaining</span>
        </div>
        <div className="progress-bar h-2.5"><div className="progress-fill h-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#3fb950,#58a6ff)' }} /></div>
        <div className="flex justify-between text-[11px] text-text3 mt-1.5">
          <span>Total remaining: <strong className="text-text2">{currency(remAmt)}</strong></span>
          <span>Interest paid so far: <strong className="text-yellow">{currency(Math.max(0, intPaid))}</strong></span>
        </div>
      </div>
      {hist.length > 0 && (
        <div className="px-5 pb-4 border-b border-border">
          <div className="text-xs font-bold text-text2 uppercase tracking-wide mb-2">Recent Payments</div>
          {hist.map((h, i) => (
            <div key={i} className="flex justify-between text-xs py-1">
              <span className="text-text3">{shortDate(h.date)}</span>
              <span className="text-text2">{h.note || 'EMI Payment'}</span>
              <span className="text-green font-semibold">{currency(h.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="p-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-text3"><i className="fa fa-calendar-day" /> Next EMI: <strong className="text-text2">{shortDate(l.emiStartDate)}</strong> · {currency(l.emi)}</div>
        <div className="flex gap-1.5">
          <button className="btn btn-ghost btn-sm" onClick={onEdit}><i className="fa fa-pen" /> Edit</button>
          <button className="btn btn-primary btn-sm" onClick={onEmi}><i className="fa fa-check" /> Mark EMI Paid</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}><i className="fa fa-trash" /></button>
        </div>
      </div>
    </div>
  );
}

function LoanModal({ open, onClose, loan, userId, toast, onSaved }) {
  const [f, setF] = useState({});

  useEffect(() => {
    if (!open) return;
    setF({
      name: loan?.name || '', bank: loan?.bank || '', principal: loan?.principal || '',
      outstanding: loan?.outstanding || '', emi: loan?.emi || '', rate: loan?.interestRate || '',
      tenure: loan?.tenure || '', paid: loan?.emisPaid || '', emiDate: loan?.emiStartDate || '', end: loan?.endDate || '',
    });
  }, [open, loan]);

  function set(k, v) { setF((prev) => ({ ...prev, [k]: v })); }

  async function save() {
    const name = (f.name || '').trim();
    const emi = parseFloat(f.emi);
    const prin = parseFloat(f.principal);
    if (!name || isNaN(emi) || isNaN(prin)) { toast('Name, Principal and EMI are required', 'error'); return; }
    const ten = parseInt(f.tenure) || 0;
    const paid = parseInt(f.paid) || 0;
    const enteredOS = parseFloat(f.outstanding);
    let outstanding;
    if (!isNaN(enteredOS) && enteredOS > 0) {
      outstanding = enteredOS;
    } else if (loan) {
      const prevPaid = loan.emisPaid || 0;
      const extraPaid = paid - prevPaid;
      if (extraPaid > 0) {
        const mi = (parseFloat(f.rate) || 0) / 100 / 12;
        let bal = loan.outstanding;
        for (let i = 0; i < extraPaid; i++) {
          const interest = bal * mi;
          const pp = Math.max(0, (loan.emi || emi) - interest);
          bal = Math.max(0, bal - pp);
        }
        outstanding = bal;
      } else outstanding = loan.outstanding;
    } else outstanding = prin;

    const payload = {
      _id: loan?._id || null, id: loan?.id || 'loan_' + Date.now(),
      name, bank: (f.bank || '').trim(), principal: prin, outstanding, emi,
      interestRate: parseFloat(f.rate) || 0, tenure: ten, emisPaid: paid, emisRemaining: ten - paid,
      emiStartDate: f.emiDate, endDate: f.end, paymentHistory: loan?.paymentHistory || [],
    };
    const ok = await api.saveLoan(userId, payload);
    if (!ok) { toast('Failed to save loan', 'error'); return; }
    toast(loan ? 'Loan updated!' : 'Loan added!');
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={loan ? 'Edit Loan' : 'Add Loan'} icon={<i className={`fa ${loan ? 'fa-pen' : 'fa-landmark'} text-blue`} />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}><i className="fa fa-check" /> Save Loan</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group"><label className="form-label">Loan Name *</label><input className="form-control" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. HDFC Personal Loan" /></div>
        <div className="form-group"><label className="form-label">Bank</label><input className="form-control" value={f.bank || ''} onChange={(e) => set('bank', e.target.value)} placeholder="e.g. HDFC Bank" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group"><label className="form-label">Principal Amount (₹) *</label><input className="form-control" type="number" value={f.principal || ''} onChange={(e) => set('principal', e.target.value)} placeholder="0" /></div>
        <div className="form-group">
          <label className="form-label">Current Outstanding (₹)</label>
          <input className="form-control" type="number" value={f.outstanding || ''} onChange={(e) => set('outstanding', e.target.value)} placeholder="Leave blank to auto-calculate" />
          <div className="form-hint">Leave blank to auto-calculate from EMIs paid</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group"><label className="form-label">Monthly EMI (₹) *</label><input className="form-control" type="number" value={f.emi || ''} onChange={(e) => set('emi', e.target.value)} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">Interest Rate (% p.a.)</label><input className="form-control" type="number" step="0.01" value={f.rate || ''} onChange={(e) => set('rate', e.target.value)} placeholder="0" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group"><label className="form-label">Tenure (months)</label><input className="form-control" type="number" value={f.tenure || ''} onChange={(e) => set('tenure', e.target.value)} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">EMIs Paid So Far</label><input className="form-control" type="number" value={f.paid || ''} onChange={(e) => set('paid', e.target.value)} placeholder="0" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group"><label className="form-label">Next EMI Date</label><input className="form-control" type="date" value={f.emiDate || ''} onChange={(e) => set('emiDate', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Loan End Date</label><input className="form-control" type="date" value={f.end || ''} onChange={(e) => set('end', e.target.value)} /></div>
      </div>
    </Modal>
  );
}

function EmiModal({ open, onClose, loan, userId, toast, onSaved }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !loan) return;
    setAmount(String(loan.emi || ''));
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
  }, [open, loan]);

  if (!loan) return null;

  const amt = parseFloat(amount) || 0;
  const mi = (loan.interestRate || 0) / 100 / 12;
  const interest = Math.round(loan.outstanding * mi);
  const principal = Math.max(0, amt - interest);

  async function save() {
    if (isNaN(amt) || amt <= 0) { toast('Enter a valid amount', 'error'); return; }
    const ok = await api.payLoanEmi(userId, loan, { amount: amt, date, note });
    if (!ok) { toast('Failed to record payment', 'error'); return; }
    toast('EMI payment recorded!');
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={`EMI — ${loan.name}`} icon={<i className="fa fa-check text-green" />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-success" onClick={save}><i className="fa fa-check" /> Confirm Payment</button></>}>
      <div className="form-group"><label className="form-label">Scheduled EMI</label><input className="form-control" readOnly value={currency(loan.emi)} /></div>
      <div className="form-group"><label className="form-label">Actual Amount Paid (₹) *</label><input className="form-control" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Payment Date</label><input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Note (optional)</label><input className="form-control" placeholder="e.g. Auto debit, NEFT..." value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="bg-bg3 rounded-s p-3 text-xs text-text2">
        <div className="font-bold text-text1 mb-1.5">Payment Breakdown (approx.)</div>
        <div className="flex justify-between"><span>Interest portion:</span><span className="text-red">{currency(interest)}</span></div>
        <div className="flex justify-between mt-1"><span>Principal reduction:</span><span className="text-green">{currency(principal)}</span></div>
      </div>
    </Modal>
  );
}
