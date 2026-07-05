import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import '../lib/chartSetup';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import * as api from '../lib/api';
import { onDataChanged } from '../lib/dataSync';
import {
  currency, monthKey, monthLabel, nameFromEmail, shortDate,
  healthScore, scoreLabel, cssVar, plannedIncome, actualIncome, plannedExpense, actualExpense,
} from '../lib/utils';

const PIE_COLORS = ['#58a6ff', '#f85149', '#3fb950', '#d29922', '#bc8cff', '#db6d28', '#39d5d5', '#ec4899'];

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme(); // re-render (and re-color charts) on theme toggle
  const [months, setMonths] = useState({});
  const [loans, setLoans] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    await api.seedIfEmpty(user.id);
    const [m, l, c] = await Promise.all([api.getMonths(user.id), api.getLoans(user.id), api.getCards(user.id)]);
    setMonths(m); setLoans(l); setCards(c); setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onDataChanged(load), []); // eslint-disable-line react-hooks/exhaustive-deps

  const mk = monthKey(new Date());
  const cm = months[mk];
  const sorted = useMemo(() => Object.values(months).sort((a, b) => (a.key > b.key ? 1 : -1)), [months]);
  const last6 = sorted.slice(-6);

  const balance = useMemo(() => {
    let b = 0;
    Object.values(months).forEach((m) => { b += actualIncome(m) - actualExpense(m); });
    return b;
  }, [months]);

  const loanOS = loans.reduce((s, l) => s + Number(l.outstanding || 0), 0);
  const ccOS = cards.reduce((s, c) => s + Number(c.outstanding || 0), 0);
  const netWorth = balance - loanOS - ccOS;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const name = nameFromEmail(user.email);
    return `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${name} 👋`;
  }, [user.email]);

  const textColor = cssVar('--text2');
  const text3 = cssVar('--text3');
  const gridColor = 'rgba(128,128,128,0.06)';
  const commonOpts = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
    plugins: {
      legend: { labels: { color: textColor, font: { size: 11 } } },
      tooltip: { callbacks: { label: (c) => ' ' + currency(c.raw) } },
    },
    scales: {
      x: { ticks: { color: text3, font: { size: 11 } }, grid: { color: gridColor } },
      y: { ticks: { color: text3, font: { size: 11 }, callback: (v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) }, grid: { color: gridColor } },
    },
  };

  if (loading) return <div className="text-text2 text-sm">Loading your financial overview…</div>;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-extrabold tracking-tight">{greeting}</h1>
        <p className="text-text2 text-sm mt-1">Financial overview • {monthLabel(mk)}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Current Balance" value={currency(balance)} sub="Based on received income & paid expenses" icon="fa-wallet" accent="var(--blue)" />
        <StatCard label="Loan Outstanding" value={currency(loanOS)} sub={loans[0]?.name || '—'} icon="fa-landmark" accent="var(--red)" />
        <StatCard label="CC Outstanding" value={currency(ccOS)} sub="Total across all cards" icon="fa-credit-card" accent="var(--orange)" />
        <StatCard label="Net Worth" value={currency(netWorth)} sub="Balance minus all liabilities" icon="fa-arrow-trend-up" accent="var(--green)" />
      </div>

      {cm && <HealthScore m={cm} loans={loans} cards={cards} />}
      {cm && <MonthGlance m={cm} />}

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="chart-card card">
          <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-chart-bar" /> Income vs Expense — Last 6 Months</div>
          <div className="h-56 relative">
            <Bar
              data={{
                labels: last6.map((m) => (m.label || m.key).split(' ')[0]),
                datasets: [
                  { label: 'Income', data: last6.map((m) => actualIncome(m)), backgroundColor: 'rgba(63,185,80,0.75)', borderRadius: 5 },
                  { label: 'Expense', data: last6.map((m) => actualExpense(m)), backgroundColor: 'rgba(248,81,73,0.75)', borderRadius: 5 },
                ],
              }}
              options={commonOpts}
            />
          </div>
        </div>
        <div className="chart-card card">
          <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-chart-line" /> Planned Balance Trend</div>
          <div className="h-56 relative">
            <Line
              data={{
                labels: sorted.map((m) => (m.label || m.key).split(' ')[0]),
                datasets: [{ label: 'Planned Balance', data: sorted.map((m) => m.balance || 0), borderColor: '#58a6ff', backgroundColor: 'rgba(88,166,255,0.07)', fill: true, tension: 0.4, pointRadius: 3 }],
              }}
              options={{ ...commonOpts, plugins: { ...commonOpts.plugins, legend: { display: false } } }}
            />
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="chart-card card">
          <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-chart-pie" /> This Month's Expense Breakdown</div>
          <div className="h-56 relative">
            {cm && cm.expenses.filter((e) => (e.planned || 0) > 0 || (e.actual || 0) > 0).length ? (
              <Doughnut
                data={{
                  labels: cm.expenses.filter((e) => (e.planned || 0) > 0 || (e.actual || 0) > 0).map((e) => e.name),
                  datasets: [{ data: cm.expenses.filter((e) => (e.planned || 0) > 0 || (e.actual || 0) > 0).map((e) => e.actual || e.planned || 0), backgroundColor: PIE_COLORS, borderWidth: 2, borderColor: cssVar('--bg2'), hoverOffset: 8 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, padding: 10, usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (c) => ' ' + currency(c.raw) } } } }}
              />
            ) : (
              <div className="empty"><i className="fa fa-chart-pie text-xl" /><p>No expense data yet</p></div>
            )}
          </div>
        </div>
        <div className="chart-card card">
          <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-list-check" /> Pending Tasks</div>
          <TaskList m={cm} />
        </div>
      </div>

      {/* Loan progress */}
      <div className="chart-card card">
        <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-landmark" /> Loan Repayment Progress</div>
        {loans.length ? loans.map((l) => <LoanProgressRow key={l._id} l={l} />) : (
          <div className="empty"><p>No loans added yet. <Link to="/loans" className="text-blue">Add a loan →</Link></p></div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="card relative overflow-hidden" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-text3 mb-1">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-[11px] text-text3 mt-1 truncate">{sub}</div>
      <i className={`fa ${icon} absolute top-3 right-3 opacity-20 text-lg`} style={{ color: accent }} />
    </div>
  );
}

function MonthGlance({ m }) {
  const pi = plannedIncome(m), ai = actualIncome(m), pe = plannedExpense(m), ae = actualExpense(m);
  const savingsRate = pi > 0 ? Math.round(((pi - pe) / pi) * 100) : 0;
  const spentPct = pe > 0 ? Math.min(100, Math.round((ae / pe) * 100)) : 0;
  const srColor = savingsRate >= 30 ? 'var(--green)' : savingsRate >= 20 ? 'var(--blue)' : savingsRate >= 0 ? 'var(--yellow)' : 'var(--red)';
  const srMsg = savingsRate >= 30 ? '🎉 Excellent saving!' : savingsRate >= 20 ? '👍 Good savings' : savingsRate >= 10 ? '⚠️ Low savings' : savingsRate >= 0 ? '⚠️ Very low savings' : '🚨 Overspending!';

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold uppercase tracking-wide text-text2">{monthLabel(monthKey(new Date()))} — At a Glance</div>
        <Link to="/income-expense" className="text-xs text-blue font-semibold">View details →</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Glance label="Planned Income" value={currency(pi)} />
        <Glance label="Received" value={currency(ai)} color="var(--green)" />
        <Glance label="Budget" value={currency(pe)} />
        <Glance label="Spent" value={`${currency(ae)} (${spentPct}%)`} color={ae > pe ? 'var(--red)' : undefined} />
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs">
        <span className="text-text2 font-semibold shrink-0">Savings Rate</span>
        <div className="progress-bar h-2 flex-1"><div className="progress-fill h-full" style={{ width: `${Math.max(0, savingsRate)}%`, background: srColor }} /></div>
        <span className="font-bold shrink-0" style={{ color: srColor }}>{savingsRate}%</span>
        <span className="text-text2 hidden sm:inline">{srMsg}</span>
      </div>
    </div>
  );
}

function Glance({ label, value, color }) {
  return (
    <div className="text-center p-3 bg-bg3 rounded-s">
      <div className="text-[10px] uppercase tracking-wide text-text3 font-bold mb-1">{label}</div>
      <div className="text-lg font-extrabold" style={{ color }}>{value}</div>
    </div>
  );
}

function HealthScore({ m, loans, cards }) {
  const pe = plannedExpense(m), pi = plannedIncome(m);
  const totalEmi = loans.reduce((s, l) => s + Number(l.emi || 0), 0);
  const totalCC = cards.reduce((s, c) => s + Number(c.outstanding || 0), 0);
  const totalLimit = cards.reduce((s, c) => s + Number(c.limit || 0), 0);
  const savingsRate = pi > 0 ? Math.round(((pi - pe) / pi) * 100) : 0;
  const emiToIncome = pi > 0 ? Math.round((totalEmi / pi) * 100) : 0;
  const ccUtil = totalLimit > 0 ? Math.round((totalCC / totalLimit) * 100) : 0;
  const score = healthScore(Math.max(0, savingsRate), emiToIncome, ccUtil);
  const { label, color } = scoreLabel(score);
  const r = 30, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const tips = [];
  if (savingsRate < 20) tips.push('Aim to save at least 20% of income each month');
  if (emiToIncome > 40) tips.push('EMI payments exceed 40% of income — consider prepayment');
  if (ccUtil > 30) tips.push('Credit utilization above 30% — pay down card balance');
  if (!tips.length) tips.push('Your finances look healthy — keep it up!');

  return (
    <div className="card mb-4 flex flex-col sm:flex-row items-center gap-5">
      <div className="relative w-[72px] h-[72px] shrink-0">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--bg4)" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 36 36)" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold" style={{ color }}>{score}</span>
          <span className="text-[9px] text-text3">/100</span>
        </div>
      </div>
      <div className="flex-1 text-center sm:text-left">
        <div className="font-bold text-sm mb-1">Financial Health: {label}</div>
        <div className="text-xs text-text2 mb-2">{tips[0]}</div>
        <div className="flex flex-wrap gap-3 justify-center sm:justify-start text-xs">
          <span>Savings Rate: <strong style={{ color: savingsRate >= 20 ? 'var(--green)' : 'var(--red)' }}>{savingsRate}%</strong></span>
          <span>EMI/Income: <strong style={{ color: emiToIncome <= 40 ? 'var(--green)' : 'var(--red)' }}>{emiToIncome}%</strong></span>
          <span>CC Utilization: <strong style={{ color: ccUtil <= 30 ? 'var(--green)' : 'var(--yellow)' }}>{ccUtil}%</strong></span>
        </div>
      </div>
    </div>
  );
}

function TaskList({ m }) {
  const tasks = [];
  if (m) {
    if (m.incomeStatus !== 'received') tasks.push({ color: 'var(--blue)', icon: 'fa-clock', text: 'Salary not yet marked received', meta: currency(m.income) + ' expected' });
    m.expenses.filter((e) => e.status === 'pending' && (e.planned || 0) > 0).forEach((e) => tasks.push({ color: 'var(--red)', icon: 'fa-triangle-exclamation', text: `${e.name} payment pending`, meta: currency(e.planned) + ' planned' }));
  }
  if (!tasks.length) return <div className="empty"><i className="fa fa-check-circle text-green text-xl" /><p>All tasks complete!</p></div>;
  return (
    <div className="max-h-56 overflow-y-auto">
      {tasks.map((t, i) => (
        <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-border last:border-0">
          <div className="w-7 h-7 rounded-s bg-text2/10 flex items-center justify-center shrink-0">
            <i className={`fa ${t.icon} text-xs`} style={{ color: t.color }} />
          </div>
          <div className="flex-1 text-sm">{t.text}</div>
          <div className="text-xs text-text2 font-semibold shrink-0">{t.meta}</div>
        </div>
      ))}
    </div>
  );
}

function LoanProgressRow({ l }) {
  const pct = l.principal ? Math.min(100, Math.round(((l.principal - l.outstanding) / l.principal) * 100)) : 0;
  return (
    <div className="py-4 border-b border-border last:border-0">
      <div className="flex justify-between items-start mb-2.5">
        <div>
          <div className="font-bold text-sm">{l.name}</div>
          <div className="text-xs text-text2 mt-0.5">{l.emisPaid}/{l.tenure} EMIs · Next: {shortDate(l.emiStartDate)}</div>
        </div>
        <div className="text-right">
          <div className="font-extrabold text-red">{currency(l.outstanding)}</div>
          <div className="text-[11px] text-text3">outstanding</div>
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-text2 mb-1.5">
        <span className="text-green font-semibold">{pct}% paid off</span>
        <span>{l.emisRemaining} EMIs remaining · {currency(l.emi)}/month</span>
      </div>
      <div className="progress-bar h-2"><div className="progress-fill h-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#3fb950,#58a6ff)' }} /></div>
    </div>
  );
}
