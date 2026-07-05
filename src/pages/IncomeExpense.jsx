import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import * as api from '../lib/api';
import { onDataChanged } from '../lib/dataSync';
import { currency, monthKey, monthLabel, shortDate, plannedIncome, actualIncome, plannedExpense, actualExpense } from '../lib/utils';
import Modal from '../components/Modal';
import MonthNav from '../components/MonthNav';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function IncomeExpense() {
  const { user } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [months, setMonths] = useState({});
  const [curMk, setCurMk] = useState(monthKey(new Date()));
  const [loading, setLoading] = useState(true);

  const [newMonthOpen, setNewMonthOpen] = useState(false);
  const [markIncomeOpen, setMarkIncomeOpen] = useState(false);
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [extraIncomeOpen, setExtraIncomeOpen] = useState(false);
  const [markExpenseOpen, setMarkExpenseOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [xlPreviewOpen, setXlPreviewOpen] = useState(false);
  const [xlData, setXlData] = useState(null);

  const [activeExtraId, setActiveExtraId] = useState(null);
  const [activeExp, setActiveExp] = useState(null);

  async function load() {
    const m = await api.getMonths(user.id);
    setMonths(m);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onDataChanged(load), []); // eslint-disable-line react-hooks/exhaustive-deps

  const m = months[curMk];

  function shiftMonth(dir) {
    const [y, mo] = curMk.split('-').map(Number);
    const d = new Date(y, mo - 1 + dir, 1);
    setCurMk(monthKey(d));
  }

  if (loading) return <div className="text-text2 text-sm">Loading…</div>;

  return (
    <div>
      <div className="page-header flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><i className="fa fa-arrows-left-right text-blue" /> Income &amp; Expense</h1>
          <p className="text-text2 text-sm">Monthly financial plan — mark items as complete to track your actual balance.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost btn-sm" onClick={() => setNewMonthOpen(true)}><i className="fa fa-plus" /> New Month</button>
          <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}><i className="fa fa-file-excel text-green" /> Import Excel</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleExcel(e, curMk, setXlData, setXlPreviewOpen, toast)} />
        </div>
      </div>

      <MonthNav curMk={curMk} months={months} onShift={shiftMonth} onJump={setCurMk} />

      {!m ? (
        <div className="empty card">
          <i className="fa fa-calendar-xmark text-xl" />
          <p>No data for this month yet.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setNewMonthOpen(true)}><i className="fa fa-plus" /> Create Month</button>
        </div>
      ) : (
        <>
          <Summary m={m} />
          <div className="grid md:grid-cols-2 gap-4">
            <IncomeCard
              m={m}
              onMarkSalary={() => setMarkIncomeOpen(true)}
              onAddIncome={() => setAddIncomeOpen(true)}
              onMarkExtra={(id) => { setActiveExtraId(id); setExtraIncomeOpen(true); }}
              onDelete={(id) => deleteItem(user.id, id, toast, load)}
            />
            <ExpenseCard
              m={m}
              onAddExpense={() => setAddExpenseOpen(true)}
              onMarkExpense={(e) => { setActiveExp(e); setMarkExpenseOpen(true); }}
              onDelete={(id) => deleteItem(user.id, id, toast, load)}
            />
          </div>
        </>
      )}

      <NewMonthModal
        open={newMonthOpen} onClose={() => setNewMonthOpen(false)} curMk={curMk}
        onCreated={(mk) => { setCurMk(mk); setNewMonthOpen(false); }}
        userId={user.id} toast={toast} onSaved={load}
      />
      {m && (
        <>
          <MarkIncomeModal open={markIncomeOpen} onClose={() => setMarkIncomeOpen(false)} m={m} userId={user.id} mk={curMk} toast={toast} onSaved={load} />
          <AddIncomeModal open={addIncomeOpen} onClose={() => setAddIncomeOpen(false)} userId={user.id} mk={curMk} toast={toast} onSaved={load} />
          <MarkExtraIncomeModal open={extraIncomeOpen} onClose={() => setExtraIncomeOpen(false)} item={m.extraIncomes.find((e) => e.id === activeExtraId)} userId={user.id} toast={toast} onSaved={load} />
          <MarkExpenseModal open={markExpenseOpen} onClose={() => setMarkExpenseOpen(false)} item={activeExp} userId={user.id} toast={toast} onSaved={load} />
          <AddExpenseModal open={addExpenseOpen} onClose={() => setAddExpenseOpen(false)} userId={user.id} mk={curMk} toast={toast} onSaved={load} />
        </>
      )}
      <XlPreviewModal open={xlPreviewOpen} onClose={() => setXlPreviewOpen(false)} data={xlData} userId={user.id} toast={toast} onImported={(mk) => { setCurMk(mk); setXlPreviewOpen(false); load(); }} />
    </div>
  );
}

async function deleteItem(userId, id, toast, reload) {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  await api.deleteExpense(userId, id);
  toast('Deleted');
  await reload();
}

function Summary({ m }) {
  const tp = plannedIncome(m), ta = actualIncome(m), pe = plannedExpense(m), ae = actualExpense(m);
  const savingsRate = tp > 0 ? Math.round(((tp - pe) / tp) * 100) : 0;
  const srColor = savingsRate >= 30 ? 'var(--green)' : savingsRate >= 20 ? 'var(--blue)' : savingsRate >= 0 ? 'var(--yellow)' : 'var(--red)';
  const srMsg = savingsRate >= 30 ? '🎉 Excellent!' : savingsRate >= 20 ? '👍 Good' : savingsRate >= 10 ? '⚠️ Low' : savingsRate >= 0 ? '⚠️ Very low' : '🚨 Overspending!';
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="card card-sm"><div className="text-[11px] uppercase text-text3 font-bold">Planned Income</div><div className="text-lg font-extrabold text-green">{currency(tp)}</div></div>
        <div className="card card-sm"><div className="text-[11px] uppercase text-text3 font-bold">Actual Income</div><div className="text-lg font-extrabold text-green">{currency(ta)}</div></div>
        <div className="card card-sm"><div className="text-[11px] uppercase text-text3 font-bold">Planned Expenses</div><div className="text-lg font-extrabold text-red">{currency(pe)}</div></div>
        <div className="card card-sm"><div className="text-[11px] uppercase text-text3 font-bold">Actual Expenses</div><div className="text-lg font-extrabold text-red">{currency(ae)}</div></div>
      </div>
      <div className="flex items-center gap-3 mb-4 text-xs">
        <span className="text-text2 font-semibold shrink-0">Monthly Savings Rate</span>
        <div className="progress-bar h-2 flex-1"><div className="progress-fill h-full" style={{ width: `${Math.max(0, savingsRate)}%`, background: srColor }} /></div>
        <span className="font-bold shrink-0" style={{ color: srColor }}>{savingsRate}%</span>
        <span className="text-text2 hidden sm:inline">{srMsg}</span>
      </div>
    </>
  );
}

function IncomeCard({ m, onMarkSalary, onAddIncome, onMarkExtra, onDelete }) {
  const salaryRec = m.incomeStatus === 'received' ? Number(m.incomeActual || 0) : 0;
  const extraRec = m.extraIncomes.reduce((s, e) => s + (e.status === 'received' ? Number(e.actual || 0) : 0), 0);
  const totalRec = salaryRec + extraRec;
  const totalPlan = plannedIncome(m);
  const anyRec = m.incomeStatus === 'received' || m.extraIncomes.some((e) => e.status === 'received');

  return (
    <div className="card p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="font-bold text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green inline-block" /> Income</div>
        <span className="font-extrabold text-green text-sm">{anyRec ? currency(totalRec) + ' received' : currency(totalPlan) + ' planned'}</span>
      </div>
      <div className="px-4 py-1">
        <Row
          icon="fa-briefcase" iconColor="var(--green)" name="Salary / Income"
          badge={m.incomeStatus === 'received' ? 'Received' : 'Expected'} badgeColor={m.incomeStatus === 'received' ? 'green' : 'blue'}
          sub={m.incomeDate ? shortDate(m.incomeDate) : ''}
          amount={m.incomeActual != null ? currency(m.incomeActual) : '—'} amountColor="var(--green)"
          planned={`Planned: ${currency(m.income)}`}
          actions={[{ icon: m.incomeStatus === 'received' ? 'fa-pen' : 'fa-check', title: m.incomeStatus === 'received' ? 'Edit' : 'Mark Received', onClick: onMarkSalary, color: m.incomeStatus === 'received' ? undefined : 'var(--green)' }]}
        />
        {m.extraIncomes.map((e) => (
          <Row
            key={e.id}
            icon="fa-coins" iconColor="var(--green)" name={e.name}
            badge={e.status === 'received' ? 'Received' : 'Expected'} badgeColor={e.status === 'received' ? 'green' : 'blue'}
            amount={e.status === 'received' && e.actual != null ? currency(e.actual) : '—'} amountColor="var(--green)"
            planned={`Planned: ${currency(e.planned)}`}
            actions={[
              { icon: e.status === 'received' ? 'fa-pen' : 'fa-check', title: e.status === 'received' ? 'Edit' : 'Mark Received', onClick: () => onMarkExtra(e.id), color: e.status !== 'received' ? 'var(--green)' : undefined },
              { icon: 'fa-trash', title: 'Delete', onClick: () => onDelete(e.id), color: 'var(--red)' },
            ]}
          />
        ))}
      </div>
      <div className="px-4 pb-3 pt-2">
        <button className="btn btn-ghost btn-sm w-full justify-center border-dashed" style={{ color: 'var(--green)', borderColor: 'rgba(63,185,80,0.3)' }} onClick={onAddIncome}>
          <i className="fa fa-plus" /> Add Income Source
        </button>
      </div>
    </div>
  );
}

function ExpenseCard({ m, onAddExpense, onMarkExpense, onDelete }) {
  const iconMap = { 'HDFC Loan': 'fa-landmark', Rent: 'fa-house', Amma: 'fa-heart', 'Monthly seat': 'fa-chair', Miscellaneous: 'fa-ellipsis' };
  const colorMap = { 'HDFC Loan': 'var(--red)', Rent: 'var(--yellow)', Amma: '#ec4899', 'Monthly seat': 'var(--purple)', Miscellaneous: 'var(--text2)' };
  const tp = plannedExpense(m), ta = actualExpense(m);

  return (
    <div className="card p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="font-bold text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red inline-block" /> Expenses</div>
        <span className="font-extrabold text-red text-sm">{ta > 0 ? currency(ta) + ' paid' : currency(tp) + ' planned'}</span>
      </div>
      <div className="px-4 py-1">
        {m.expenses.length === 0 && <div className="empty py-4"><p>No expenses yet</p></div>}
        {m.expenses.map((e) => {
          const sc = e.status === 'paid' ? 'green' : e.status === 'skipped' ? 'gray' : 'yellow';
          const sl = e.status === 'paid' ? 'Paid' : e.status === 'skipped' ? 'Skipped' : 'Pending';
          return (
            <Row
              key={e.id}
              icon={iconMap[e.name] || 'fa-receipt'} iconColor={colorMap[e.name] || 'var(--blue)'} name={e.name}
              badge={sl} badgeColor={sc} sub={e.date ? shortDate(e.date) : ''}
              amount={e.actual != null ? currency(e.actual) : '—'} amountColor={e.status === 'paid' ? 'var(--red)' : 'var(--text2)'}
              planned={`Planned: ${currency(e.planned)}`}
              actions={[
                { icon: e.status === 'paid' ? 'fa-pen' : 'fa-check', title: e.status === 'paid' ? 'Edit' : 'Mark Paid', onClick: () => onMarkExpense(e), color: e.status !== 'paid' ? 'var(--blue)' : undefined },
                { icon: 'fa-trash', title: 'Delete', onClick: () => onDelete(e.id), color: 'var(--red)' },
              ]}
            />
          );
        })}
      </div>
      <div className="px-4 pb-3 pt-2">
        <button className="btn btn-ghost btn-sm w-full justify-center border-dashed" style={{ color: 'var(--red)', borderColor: 'rgba(248,81,73,0.3)' }} onClick={onAddExpense}>
          <i className="fa fa-plus" /> Add Expense
        </button>
      </div>
    </div>
  );
}

function Row({ icon, iconColor, name, badge, badgeColor, sub, amount, amountColor, planned, actions }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-s flex items-center justify-center shrink-0" style={{ background: 'rgba(128,128,128,0.08)', color: iconColor }}>
        <i className={`fa ${icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{name}</div>
        <div className="text-xs mt-0.5">
          <span className={`badge badge-${badgeColor}`}>{badge}</span>{sub ? ` · ${sub}` : ''}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold" style={{ color: amountColor }}>{amount}</div>
        <div className="text-[11px] text-text3">{planned}</div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {actions.map((a, i) => (
          <button key={i} className="btn-icon" title={a.title} onClick={a.onClick} style={{ color: a.color, borderColor: a.color ? `${a.color}4d` : undefined }}>
            <i className={`fa ${a.icon}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function NewMonthModal({ open, onClose, curMk, onCreated, userId, toast }) {
  const [y, setY] = useState('');
  const [mo, setMo] = useState('01');
  const [income, setIncome] = useState('');

  useEffect(() => {
    if (!open) return;
    const [cy, cm] = curMk.split('-').map(Number);
    const next = new Date(cy, cm, 1);
    setY(String(next.getFullYear()));
    setMo(String(next.getMonth() + 1).padStart(2, '0'));
    setIncome('');
  }, [open, curMk]);

  async function save() {
    if (!y || !mo) { toast('Select year and month', 'error'); return; }
    const mk = `${y}-${mo}`;
    const ok = await api.createMonth(userId, mk, parseFloat(income) || 0);
    if (!ok) { toast('Month already exists or failed to create', 'error'); return; }
    toast(`${monthLabel(mk)} created!`);
    onCreated(mk);
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Month" icon={<i className="fa fa-calendar-plus text-blue" />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}><i className="fa fa-plus" /> Create Month</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group"><label className="form-label">Year *</label><input className="form-control" type="number" min="2020" max="2050" value={y} onChange={(e) => setY(e.target.value)} /></div>
        <div className="form-group">
          <label className="form-label">Month *</label>
          <select className="form-control" value={mo} onChange={(e) => setMo(e.target.value)}>
            {MONTH_NAMES.map((n, i) => <option key={n} value={String(i + 1).padStart(2, '0')}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Planned Income (₹)</label><input className="form-control" type="number" placeholder="0" value={income} onChange={(e) => setIncome(e.target.value)} /></div>
    </Modal>
  );
}

function MarkIncomeModal({ open, onClose, m, userId, mk, toast, onSaved }) {
  const [actual, setActual] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setActual(String(m.incomeActual || m.income || ''));
    setDate(m.incomeDate || new Date().toISOString().split('T')[0]);
    setNote(m.incomeNote || '');
  }, [open, m]);

  async function save() {
    const amt = parseFloat(actual);
    if (isNaN(amt)) { toast('Enter a valid amount', 'error'); return; }
    await api.saveMonthIncome(userId, mk, { incomeActual: amt, incomeStatus: 'received', incomeDate: date, incomeNote: note });
    toast('Salary marked as received!');
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Mark Salary Received" icon={<i className="fa fa-briefcase text-green" />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-success" onClick={save}><i className="fa fa-check" /> Mark Received</button></>}>
      <div className="form-group"><label className="form-label">Planned Amount</label><input className="form-control" readOnly value={currency(m.income)} /></div>
      <div className="form-group"><label className="form-label">Actual Amount Received (₹) *</label><input className="form-control" type="number" value={actual} onChange={(e) => setActual(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Date Received</label><input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Note (optional)</label><input className="form-control" placeholder="e.g. Including bonus" value={note} onChange={(e) => setNote(e.target.value)} /></div>
    </Modal>
  );
}

function AddIncomeModal({ open, onClose, userId, mk, toast, onSaved }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => { if (open) { setName(''); setAmount(''); setNote(''); } }, [open]);

  async function save() {
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt)) { toast('Enter name and amount', 'error'); return; }
    await api.addExpense(userId, mk, { name: name.trim(), planned: amt, note, isIncome: true });
    toast('Income source added!');
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Income Source" icon={<i className="fa fa-plus text-green" />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-success" onClick={save}><i className="fa fa-plus" /> Add Source</button></>}>
      <div className="form-group"><label className="form-label">Source Name *</label><input className="form-control" placeholder="e.g. Freelance, Rental, Bonus..." value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Expected Amount (₹) *</label><input className="form-control" type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Note (optional)</label><input className="form-control" placeholder="Any notes..." value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <p className="form-hint">This adds a planned income source. Mark it as received once the money arrives.</p>
    </Modal>
  );
}

function MarkExtraIncomeModal({ open, onClose, item, userId, toast, onSaved }) {
  const [actual, setActual] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!open || !item) return;
    setActual(String(item.planned || ''));
    setDate(new Date().toISOString().split('T')[0]);
  }, [open, item]);

  if (!item) return null;

  async function save() {
    const amt = parseFloat(actual);
    if (isNaN(amt)) { toast('Enter a valid amount', 'error'); return; }
    await api.updateExpense(userId, item.id, { actual: amt, status: 'received', date });
    toast('Income marked received!');
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Mark "${item.name}" Received`} icon={<i className="fa fa-check text-green" />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-success" onClick={save}><i className="fa fa-check" /> Mark Received</button></>}>
      <div className="form-group"><label className="form-label">Planned Amount</label><input className="form-control" readOnly value={currency(item.planned)} /></div>
      <div className="form-group"><label className="form-label">Actual Amount Received (₹) *</label><input className="form-control" type="number" value={actual} onChange={(e) => setActual(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Date Received</label><input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
    </Modal>
  );
}

function MarkExpenseModal({ open, onClose, item, userId, toast, onSaved }) {
  const [actual, setActual] = useState('');
  const [status, setStatus] = useState('paid');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !item) return;
    setActual(String(item.actual != null ? item.actual : item.planned || ''));
    setStatus(item.status === 'skipped' ? 'skipped' : 'paid');
    setDate(new Date().toISOString().split('T')[0]);
    setNote(item.note || '');
  }, [open, item]);

  if (!item) return null;

  async function save() {
    const amt = parseFloat(actual);
    if (isNaN(amt)) { toast('Enter a valid amount', 'error'); return; }
    await api.updateExpense(userId, item.id, { actual: amt, status, date, note });
    toast('Expense updated!');
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={item.name} icon={<i className="fa fa-receipt text-blue" />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-success" onClick={save}><i className="fa fa-check" /> Save</button></>}>
      <div className="form-group"><label className="form-label">Planned Amount</label><input className="form-control" readOnly value={currency(item.planned)} /></div>
      <div className="form-group"><label className="form-label">Actual Amount Paid (₹) *</label><input className="form-control" type="number" value={actual} onChange={(e) => setActual(e.target.value)} /></div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="paid">Paid</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>
      <div className="form-group"><label className="form-label">Date</label><input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Note (optional)</label><input className="form-control" placeholder="e.g. Paid via UPI" value={note} onChange={(e) => setNote(e.target.value)} /></div>
    </Modal>
  );
}

function AddExpenseModal({ open, onClose, userId, mk, toast, onSaved }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => { if (open) { setName(''); setAmount(''); setNote(''); } }, [open]);

  async function save() {
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt)) { toast('Enter name and amount', 'error'); return; }
    await api.addExpense(userId, mk, { name: name.trim(), planned: amt, note, isIncome: false });
    toast('Expense added!');
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Expense" icon={<i className="fa fa-plus text-red" />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}><i className="fa fa-plus" /> Add Expense</button></>}>
      <div className="form-group"><label className="form-label">Expense Name *</label><input className="form-control" placeholder="e.g. Groceries, Electricity Bill..." value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Planned Amount (₹) *</label><input className="form-control" type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Note (optional)</label><input className="form-control" placeholder="Any notes..." value={note} onChange={(e) => setNote(e.target.value)} /></div>
    </Modal>
  );
}

function handleExcel(e, curMk, setXlData, setXlPreviewOpen, toast) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      parseExcelRows(rows, curMk, setXlData, setXlPreviewOpen, toast);
    } catch {
      toast('Failed to read Excel file', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
}

function parseExcelRows(rows, curMk, setXlData, setXlPreviewOpen, toast) {
  if (!rows || rows.length < 2) { toast('No data found in file', 'error'); return; }
  let mk = curMk;
  const incomes = [], expenses = [];
  const first = String(rows[0][0] || '').trim();
  const mMatch = first.match(/([A-Za-z]+)\s+(\d{4})/);
  if (mMatch) {
    const d = new Date(`${mMatch[1]} 1 ${mMatch[2]}`);
    if (!isNaN(d)) mk = monthKey(d);
  }
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    const amount = parseFloat(row[1]) || 0;
    const type = String(row[2] || 'expense').toLowerCase();
    if (!name || !amount) continue;
    if (type === 'income') incomes.push({ name, amount }); else expenses.push({ name, amount });
  }
  if (!incomes.length && !expenses.length) { toast('No valid rows found', 'error'); return; }
  setXlData({ mk, incomes, expenses });
  setXlPreviewOpen(true);
}

function XlPreviewModal({ open, onClose, data, userId, toast, onImported }) {
  if (!data) return null;
  const { mk, incomes, expenses } = data;

  async function confirmImport() {
    const totalInc = incomes.reduce((s, i) => s + i.amount, 0);
    await api.createMonth(userId, mk, totalInc);
    for (const i of incomes) await api.addExpense(userId, mk, { name: i.name, planned: i.amount, note: '', isIncome: true });
    for (const e of expenses) await api.addExpense(userId, mk, { name: e.name, planned: e.amount, note: '', isIncome: false });
    toast(`${monthLabel(mk)} imported!`);
    onImported(mk);
  }

  return (
    <Modal open={open} onClose={onClose} large title="Excel Import Preview" icon={<i className="fa fa-file-excel text-green" />}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-success" onClick={confirmImport}><i className="fa fa-check" /> Confirm Import</button></>}>
      <p className="text-xs text-text2 mb-3">Review before importing. Format: Column A = Name, B = Amount, C = Type (income/expense), Row 1 = Month label (optional)</p>
      <div className="max-h-80 overflow-y-auto">
        <div className="font-bold mb-3 text-sm">Importing into: <span className="text-blue">{monthLabel(mk)}</span></div>
        {incomes.length > 0 && (
          <>
            <div className="text-xs font-bold text-green mb-2">Income ({incomes.length} items)</div>
            {incomes.map((i, idx) => <div key={idx} className="flex justify-between py-2 border-b border-border text-sm"><span>{i.name}</span><span className="text-green font-semibold">{currency(i.amount)}</span></div>)}
          </>
        )}
        {expenses.length > 0 && (
          <>
            <div className="text-xs font-bold text-red mt-3 mb-2">Expenses ({expenses.length} items)</div>
            {expenses.map((e, idx) => <div key={idx} className="flex justify-between py-2 border-b border-border text-sm"><span>{e.name}</span><span className="text-red font-semibold">{currency(e.amount)}</span></div>)}
          </>
        )}
      </div>
    </Modal>
  );
}
