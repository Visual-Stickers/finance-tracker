import { useEffect, useMemo, useState } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import '../lib/chartSetup';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import * as api from '../lib/api';
import { onDataChanged } from '../lib/dataSync';
import {
  currency, monthKey, cssVar, exportToCSV,
  plannedIncome, actualIncome, plannedExpense, actualExpense,
} from '../lib/utils';
import MonthNav from '../components/MonthNav';

const COLORS = ['#58a6ff', '#f85149', '#3fb950', '#d29922', '#bc8cff', '#db6d28', '#39d5d5', '#ec4899'];

export default function Reports() {
  const { user } = useAuth();
  const toast = useToast();
  const [months, setMonths] = useState({});
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('monthly');
  const [curMo, setCurMo] = useState(monthKey(new Date()));
  const [curYr, setCurYr] = useState(new Date().getFullYear());

  async function load() {
    const [m, l] = await Promise.all([api.getMonths(user.id), api.getLoans(user.id)]);
    setMonths(m); setLoans(l); setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onDataChanged(load), []); // eslint-disable-line react-hooks/exhaustive-deps

  function shiftMo(d) {
    const [y, m] = curMo.split('-').map(Number);
    setCurMo(monthKey(new Date(y, m - 1 + d, 1)));
  }

  function exportReport() {
    if (tab === 'monthly') {
      const m = months[curMo];
      if (!m) { toast('No data to export', 'error'); return; }
      const rows = m.expenses.map((e) => ({ Month: m.label || curMo, Name: e.name, Planned: e.planned || 0, Actual: e.actual || '', Status: e.status || 'pending', Date: e.date || '', Note: e.note || '' }));
      exportToCSV(`income-expense-${curMo}`, rows);
    } else {
      const yms = Object.values(months).filter((m) => m.key?.startsWith(String(curYr))).sort((a, b) => (a.key > b.key ? 1 : -1));
      const rows = yms.map((m) => {
        const pi = plannedIncome(m), pe = plannedExpense(m);
        return { Month: m.label || m.key, 'Planned Income': pi, 'Planned Expense': pe, 'Planned Balance': pi - pe, 'Savings Rate %': pi ? Math.round(((pi - pe) / pi) * 100) : 0, 'Income Status': m.incomeStatus || 'expected' };
      });
      exportToCSV(`yearly-report-${curYr}`, rows);
    }
    toast('Export downloaded!');
  }

  if (loading) return <div className="text-text2 text-sm">Loading…</div>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><i className="fa fa-chart-pie text-purple" /> Reports &amp; Analytics</h1>
          <p className="text-text2 text-sm">Deep dive into your financial data with visual charts and insights.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportReport}><i className="fa fa-download" /> Export CSV</button>
      </div>

      <div className="flex gap-1 mb-4 border border-border rounded-s w-fit overflow-hidden">
        <button className={`px-4 py-2 text-sm font-semibold ${tab === 'monthly' ? 'bg-blue text-white' : 'text-text2'}`} onClick={() => setTab('monthly')}><i className="fa fa-calendar-day" /> Monthly</button>
        <button className={`px-4 py-2 text-sm font-semibold ${tab === 'yearly' ? 'bg-blue text-white' : 'text-text2'}`} onClick={() => setTab('yearly')}><i className="fa fa-calendar" /> Yearly</button>
      </div>

      {tab === 'monthly' ? (
        <MonthlyView months={months} curMo={curMo} setCurMo={setCurMo} shiftMo={shiftMo} />
      ) : (
        <YearlyView months={months} loans={loans} curYr={curYr} setCurYr={setCurYr} />
      )}
    </div>
  );
}

function MonthlyView({ months, curMo, setCurMo, shiftMo }) {
  const m = months[curMo];
  const textColor = cssVar('--text2'), text3 = cssVar('--text3');
  const CO = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
    plugins: { legend: { labels: { color: textColor, font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => ' ' + currency(c.raw) } } },
    scales: {
      x: { ticks: { color: text3, font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.06)' } },
      y: { ticks: { color: text3, font: { size: 11 }, callback: (v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) }, grid: { color: 'rgba(128,128,128,0.06)' } },
    },
  };

  return (
    <div>
      <MonthNav curMk={curMo} months={months} onShift={shiftMo} onJump={setCurMo} />
      {!m ? (
        <div className="empty card"><p>No data for this month</p></div>
      ) : (
        <MonthlyBody m={m} CO={CO} textColor={textColor} />
      )}
    </div>
  );
}

function MonthlyBody({ m, CO, textColor }) {
  const pi = plannedIncome(m), ai = actualIncome(m), pe = plannedExpense(m), ae = actualExpense(m);
  const sr = pi > 0 ? Math.round(((pi - pe) / pi) * 100) : 0;
  const srColor = sr >= 30 ? 'var(--green)' : sr >= 20 ? 'var(--blue)' : sr >= 0 ? 'var(--yellow)' : 'var(--red)';
  const expItems = m.expenses.filter((e) => (e.planned || 0) > 0 || (e.actual || 0) > 0);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="card card-sm"><div className="text-[11px] uppercase text-text3 font-bold">Planned Income</div><div className="text-lg font-extrabold text-green">{currency(pi)}</div></div>
        <div className="card card-sm"><div className="text-[11px] uppercase text-text3 font-bold">Actual Income</div><div className="text-lg font-extrabold text-green">{currency(ai)}</div></div>
        <div className="card card-sm"><div className="text-[11px] uppercase text-text3 font-bold">Planned Expense</div><div className="text-lg font-extrabold text-red">{currency(pe)}</div></div>
        <div className="card card-sm"><div className="text-[11px] uppercase text-text3 font-bold">Actual Expense</div><div className="text-lg font-extrabold text-red">{currency(ae)}</div></div>
      </div>
      <div className="flex items-center gap-3 mb-4 text-xs">
        <span className="text-text2 font-semibold shrink-0">Savings Rate</span>
        <div className="progress-bar h-2 flex-1"><div className="progress-fill h-full" style={{ width: `${Math.max(0, sr)}%`, background: srColor }} /></div>
        <span className="font-bold shrink-0" style={{ color: srColor }}>{sr}%</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-chart-bar" /> Income vs Expense</div>
          <div className="h-60"><Bar data={{ labels: ['Planned Income', 'Actual Income', 'Planned Expense', 'Actual Expense'], datasets: [{ data: [pi, ai, pe, ae], backgroundColor: ['rgba(63,185,80,0.6)', 'rgba(63,185,80,1)', 'rgba(248,81,73,0.6)', 'rgba(248,81,73,1)'], borderRadius: 5 }] }} options={{ ...CO, plugins: { ...CO.plugins, legend: { display: false } } }} /></div>
        </div>
        <div className="card">
          <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-chart-pie" /> Expense Breakdown</div>
          <div className="h-60">
            {expItems.length ? (
              <Doughnut data={{ labels: expItems.map((e) => e.name), datasets: [{ data: expItems.map((e) => e.actual || e.planned || 0), backgroundColor: COLORS, borderWidth: 2, borderColor: cssVar('--bg2'), hoverOffset: 8 }] }} options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, padding: 10, usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (c) => ' ' + currency(c.raw) } } } }} />
            ) : <div className="empty"><p>No expense data</p></div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="font-semibold text-sm mb-3 flex items-center gap-2"><i className="fa fa-table" /> Expense Detail</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-text3 text-xs border-b border-border"><th className="pb-2">Expense</th><th className="pb-2">Planned</th><th className="pb-2">Actual</th><th className="pb-2">Variance</th><th className="pb-2">Status</th></tr></thead>
            <tbody>
              {m.expenses.map((e) => {
                const v = e.actual != null ? e.actual - e.planned : 0;
                const vColor = v > 0 ? 'var(--red)' : v < 0 ? 'var(--green)' : 'var(--text2)';
                return (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="py-2 font-semibold">{e.name}</td>
                    <td className="py-2">{currency(e.planned || 0)}</td>
                    <td className="py-2">{e.actual != null ? currency(e.actual) : '—'}</td>
                    <td className="py-2 font-semibold" style={{ color: vColor }}>{e.actual != null ? (v > 0 ? '+' : '') + currency(v) : '—'}</td>
                    <td className="py-2"><span className={`badge badge-${e.status === 'paid' ? 'green' : e.status === 'skipped' ? 'gray' : 'yellow'}`}>{e.status || 'pending'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function YearlyView({ months, loans, curYr, setCurYr }) {
  const textColor = cssVar('--text2'), text3 = cssVar('--text3');
  const CO = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
    plugins: { legend: { labels: { color: textColor, font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => ' ' + currency(c.raw) } } },
    scales: {
      x: { ticks: { color: text3, font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.06)' } },
      y: { ticks: { color: text3, font: { size: 11 }, callback: (v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) }, grid: { color: 'rgba(128,128,128,0.06)' } },
    },
  };

  const yms = useMemo(() => Object.values(months).filter((m) => m.key?.startsWith(String(curYr))).sort((a, b) => (a.key > b.key ? 1 : -1)), [months, curYr]);

  // FIX: originally this view summed only `m.income` (main salary), silently
  // dropping every extra income source from the yearly totals, chart and
  // table — even though the monthly view had been fixed to include them.
  // Using the same plannedIncome()/actualIncome() helpers as every other
  // page means this can't drift out of sync again.
  const ti = yms.reduce((s, m) => s + plannedIncome(m), 0);
  const te = yms.reduce((s, m) => s + plannedExpense(m), 0);
  const ns = ti - te;
  const sr = ti > 0 ? Math.round((ns / ti) * 100) : 0;

  const labels = yms.map((m) => (m.label || m.key).split(' ')[0]);
  let run = 0;
  const cumulative = yms.map((m) => { run += plannedIncome(m) - plannedExpense(m); return run; });

  const expTotals = {};
  yms.forEach((m) => m.expenses.forEach((e) => { expTotals[e.name] = (expTotals[e.name] || 0) + (e.planned || 0); }));
  const expEntries = Object.entries(expTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  const loan = loans[0];
  let loanForecast = null;
  if (loan) {
    const mi = (loan.interestRate || 0) / 100 / 12;
    const lls = [], lbs = [];
    let b = loan.outstanding;
    for (let i = 0; i <= Math.min(loan.emisRemaining || 24, 36); i++) {
      lls.push('M+' + i);
      lbs.push(Math.max(0, Math.round(b)));
      const interest = b * mi;
      b -= Math.max(0, (loan.emi || 0) - interest);
    }
    loanForecast = { lls, lbs };
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button className="btn-icon" onClick={() => setCurYr((y) => y - 1)}><i className="fa fa-chevron-left" /></button>
        <span className="font-bold text-base min-w-[60px] text-center">{curYr}</span>
        <button className="btn-icon" onClick={() => setCurYr((y) => y + 1)}><i className="fa fa-chevron-right" /></button>
      </div>

      <div className="card mb-5" style={{ background: 'linear-gradient(135deg,#0d1117,#1a1b2e)', borderColor: 'rgba(188,140,255,0.2)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div><div className="text-[10px] uppercase tracking-wide font-bold mb-2" style={{ color: '#a78bfa' }}>Total Income</div><div className="text-xl font-extrabold text-green">{currency(ti)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide font-bold mb-2" style={{ color: '#a78bfa' }}>Total Expense</div><div className="text-xl font-extrabold text-red">{currency(te)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide font-bold mb-2" style={{ color: '#a78bfa' }}>Net Savings</div><div className="text-xl font-extrabold text-purple">{currency(ns)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide font-bold mb-2" style={{ color: '#a78bfa' }}>Savings Rate</div><div className="text-xl font-extrabold" style={{ color: sr >= 20 ? 'var(--green)' : sr >= 0 ? 'var(--yellow)' : 'var(--red)' }}>{sr}%</div></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-chart-bar" /> Monthly Income vs Expense</div>
          <div className="h-60"><Bar data={{ labels, datasets: [{ label: 'Income', data: yms.map((m) => plannedIncome(m)), backgroundColor: 'rgba(63,185,80,0.7)', borderRadius: 4 }, { label: 'Expense', data: yms.map((m) => plannedExpense(m)), backgroundColor: 'rgba(248,81,73,0.7)', borderRadius: 4 }] }} options={CO} /></div>
        </div>
        <div className="card">
          <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-wave-square" /> Cumulative Savings</div>
          <div className="h-60"><Line data={{ labels, datasets: [{ label: 'Cumulative Savings', data: cumulative, borderColor: '#3fb950', backgroundColor: 'rgba(63,185,80,0.07)', fill: true, tension: 0.4, pointRadius: 4 }] }} options={{ ...CO, plugins: { ...CO.plugins, legend: { display: false } } }} /></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-chart-pie" /> Yearly Expense Breakdown</div>
          <div className="h-60">
            {expEntries.length ? <Doughnut data={{ labels: expEntries.map(([k]) => k), datasets: [{ data: expEntries.map(([, v]) => v), backgroundColor: COLORS, borderWidth: 2, borderColor: cssVar('--bg2'), hoverOffset: 8 }] }} options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, padding: 10, usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (c) => ' ' + currency(c.raw) } } } }} /> : <div className="empty"><p>No expense data</p></div>}
          </div>
        </div>
        <div className="card">
          <div className="font-semibold text-sm mb-2 flex items-center gap-2"><i className="fa fa-landmark" /> Loan Payoff Forecast</div>
          <div className="h-60">
            {loanForecast ? <Line data={{ labels: loanForecast.lls, datasets: [{ label: 'Outstanding', data: loanForecast.lbs, borderColor: '#f85149', backgroundColor: 'rgba(248,81,73,0.07)', fill: true, tension: 0.4, pointRadius: 2 }] }} options={{ ...CO, plugins: { ...CO.plugins, legend: { display: false } } }} /> : <div className="empty"><i className="fa fa-landmark text-xl" /><p>No loans to forecast</p></div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="font-semibold text-sm mb-3 flex items-center gap-2"><i className="fa fa-table" /> Month-by-Month Summary</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-text3 text-xs border-b border-border"><th className="pb-2">Month</th><th className="pb-2">Planned Income</th><th className="pb-2">Planned Expense</th><th className="pb-2">Planned Balance</th><th className="pb-2">Savings Rate</th><th className="pb-2">Status</th></tr></thead>
            <tbody>
              {yms.map((m) => {
                const mpi = plannedIncome(m), mpe = plannedExpense(m);
                const bal = mpi - mpe;
                const rate = mpi ? Math.round((bal / mpi) * 100) : 0;
                const rc = rate >= 30 ? 'var(--green)' : rate >= 20 ? 'var(--blue)' : rate >= 0 ? 'var(--yellow)' : 'var(--red)';
                const allPaid = m.expenses.length > 0 && m.expenses.every((e) => e.status === 'paid');
                return (
                  <tr key={m.key} className="border-b border-border last:border-0">
                    <td className="py-2 font-bold">{m.label || m.key}</td>
                    <td className="py-2 text-green">{currency(mpi)}</td>
                    <td className="py-2 text-red">{currency(mpe)}</td>
                    <td className="py-2 font-bold text-blue">{currency(bal)}</td>
                    <td className="py-2 font-bold" style={{ color: rc }}>{rate}%</td>
                    <td className="py-2"><span className={`badge badge-${allPaid ? 'green' : m.incomeStatus === 'received' ? 'yellow' : 'gray'}`}>{allPaid ? 'Complete' : m.incomeStatus === 'received' ? 'Partial' : 'Pending'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
