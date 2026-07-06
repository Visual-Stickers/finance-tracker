// storage.js - All Supabase DB operations (optimized)
const DB = {

  // ── Seed ─────────────────────────────────────────────────────────────
  // FIX: this used to gate on a sessionStorage flag, which resets on every
  // new tab/incognito window — and if the "do I already have data?" check
  // ever failed silently (no error handling), it would happily insert the
  // demo loan + demo expenses again ON TOP of your real data (loans and
  // month_expenses have no uniqueness constraint), which looks exactly like
  // "my data got reset". The flag now lives in the `profiles` table itself,
  // so it's reliable across tabs, incognito windows, and devices, and a
  // failed check now blocks seeding instead of defaulting to "seed anyway".
  async seed(userId) {
    const sb = getSB();

    const { data: profile, error: profErr } = await sb.from('profiles').select('has_seeded').eq('id', userId).single();
    if (profErr && profErr.code !== 'PGRST116') { // PGRST116 = no row yet, which is fine
      console.error('seed: could not check profile, skipping seed to be safe:', profErr);
      return;
    }
    if (profile?.has_seeded) return;

    // Belt-and-suspenders: even if the profile flag is missing/stale, don't
    // seed if the user already has real months data.
    const { data: existing, error: monthsErr } = await sb.from('months').select('id').eq('user_id', userId).limit(1);
    if (monthsErr) {
      console.error('seed: could not check existing months, skipping seed to be safe:', monthsErr);
      return;
    }
    if (existing && existing.length > 0) {
      await sb.from('profiles').upsert({ id: userId, has_seeded: true }, { onConflict: 'id' });
      return;
    }

    // Batch all loan inserts
    const loanRows = MASTER_DATA.loans.map(l => ({
      user_id: userId, loan_ref: l.id, name: l.name, bank: l.bank,
      principal: l.principal, net_disbursed: l.netDisbursed, outstanding: l.outstanding,
      emi: l.emi, interest_rate: l.interestRate, apr: l.apr,
      total_interest: l.totalInterest, total_payable: l.totalPayable,
      tenure: l.tenure, emis_paid: l.emisPaid, emis_remaining: l.emisRemaining,
      start_date: l.startDate, end_date: l.endDate,
      emi_start_date: l.emiStartDate, emi_end_date: l.emiEndDate,
      repayment_mode: l.repaymentMode, processing_fee: l.processingFee,
      stamp_duty: l.stampDuty, insurance: l.insurance, bounce_charge: l.bounceCharge,
      payment_history: []
    }));
    if (loanRows.length) await sb.from('loans').insert(loanRows);

    // Batch all month inserts
    const monthRows = MASTER_DATA.months.map(m => ({
      user_id: userId, month_key: m.key, label: m.label,
      income: m.income, income_status: 'expected', balance: m.balance
    }));
    await sb.from('months').insert(monthRows);

    // Batch ALL expense inserts in one call
    const expRows = [];
    for (const m of MASTER_DATA.months) {
      Object.entries(m.expenses).forEach(([name, planned], i) => {
        expRows.push({
          user_id: userId, month_key: m.key, name, planned,
          status: 'pending', sort_order: i, is_income: false
        });
      });
    }
    if (expRows.length) await sb.from('month_expenses').insert(expRows);

    await sb.from('profiles').upsert({ id: userId, has_seeded: true }, { onConflict: 'id' });
  },

  // ── Months ────────────────────────────────────────────────────────────
  async getMonths(userId) {
    const sb = getSB();
    const [{ data: mRows, error: e1 }, { data: eRows, error: e2 }] = await Promise.all([
      sb.from('months').select('*').eq('user_id', userId).order('month_key'),
      sb.from('month_expenses').select('*').eq('user_id', userId).order('sort_order')
    ]);
    if (e1) console.error('getMonths error:', e1);
    if (e2) console.error('getExpenses error:', e2);

    const months = {};
    for (const m of (mRows || [])) {
      months[m.month_key] = {
        id: m.id, key: m.month_key, label: m.label,
        income: m.income || 0,
        incomeActual: m.income_actual,
        incomeStatus: m.income_status || 'expected',
        incomeDate: m.income_date,
        incomeNote: m.income_note,
        balance: m.balance || 0,
        expenses: [],
        extraIncomes: []
      };
    }
    for (const e of (eRows || [])) {
      if (!months[e.month_key]) continue;
      const item = {
        id: e.id, name: e.name, planned: e.planned || 0,
        actual: e.actual, status: e.status,
        date: e.date, note: e.note, sort_order: e.sort_order,
        source: e.source || null
      };
      if (e.is_income) months[e.month_key].extraIncomes.push(item);
      else months[e.month_key].expenses.push(item);
    }
    return months;
  },

  async upsertMonth(userId, monthKey) {
    const sb = getSB();
    const d = new Date(monthKey + '-01');
    const label = d.toLocaleDateString('en-IN', { month:'short', year:'numeric' });
    const { error } = await sb.from('months').upsert(
      { user_id: userId, month_key: monthKey, label, income: 0, income_status: 'expected', balance: 0 },
      { onConflict: 'user_id,month_key', ignoreDuplicates: true }
    );
    if (error) console.error('upsertMonth error:', error);
    return !error;
  },

  async saveMonthIncome(userId, monthKey, fields) {
    const sb = getSB();
    const patch = {};
    if (fields.income       !== undefined) patch.income        = Number(fields.income) || 0;
    if (fields.incomeActual !== undefined) patch.income_actual = Number(fields.incomeActual) || 0;
    if (fields.incomeStatus !== undefined) patch.income_status = fields.incomeStatus;
    if (fields.incomeDate   !== undefined) patch.income_date   = fields.incomeDate || null;
    if (fields.incomeNote   !== undefined) patch.income_note   = fields.incomeNote || '';
    const { error } = await sb.from('months').update(patch).eq('user_id', userId).eq('month_key', monthKey);
    if (error) { console.error('saveMonthIncome error:', error); return false; }
    Utils.notifyDataChanged();
    return true;
  },

  async addExpense(userId, monthKey, { name, planned, note, isIncome, source }) {
    const sb = getSB();
    await this.upsertMonth(userId, monthKey);
    const { data: existing } = await sb.from('month_expenses')
      .select('sort_order').eq('user_id', userId).eq('month_key', monthKey)
      .eq('is_income', !!isIncome).order('sort_order', { ascending: false }).limit(1);
    const nextOrder = existing?.length ? existing[0].sort_order + 1 : 0;
    const { data, error } = await sb.from('month_expenses').insert({
      user_id: userId, month_key: monthKey, name,
      planned: Number(planned) || 0, actual: null,
      status: isIncome ? 'expected' : 'pending',
      note: note || '', sort_order: nextOrder, is_income: !!isIncome,
      source: source || null
    }).select().single();
    if (error) { console.error('addExpense error:', error); return null; }
    Utils.notifyDataChanged();
    return data;
  },

  async updateExpense(userId, expId, fields) {
    const sb = getSB();
    const patch = {};
    if (fields.actual  !== undefined) patch.actual  = fields.actual !== null ? Number(fields.actual) : null;
    if (fields.status  !== undefined) patch.status  = fields.status;
    if (fields.date    !== undefined) patch.date    = fields.date || null;
    if (fields.note    !== undefined) patch.note    = fields.note || '';
    if (fields.planned !== undefined) patch.planned = Number(fields.planned) || 0;
    if (fields.name    !== undefined) patch.name    = fields.name;
    const { error } = await sb.from('month_expenses').update(patch).eq('id', expId).eq('user_id', userId);
    if (error) { console.error('updateExpense error:', error); return false; }
    Utils.notifyDataChanged();
    return true;
  },

  async deleteExpense(userId, expId) {
    const { error } = await getSB().from('month_expenses').delete().eq('id', expId).eq('user_id', userId);
    if (error) { console.error('deleteExpense error:', error); return false; }
    Utils.notifyDataChanged();
    return !error;
  },

  async createMonth(userId, monthKey, income) {
    const sb = getSB();
    const d = new Date(monthKey + '-01');
    const label = d.toLocaleDateString('en-IN', { month:'short', year:'numeric' });
    const { error } = await sb.from('months').insert({
      user_id: userId, month_key: monthKey, label,
      income: Number(income) || 0, income_status: 'expected', balance: 0
    });
    if (error && error.code !== '23505') { console.error('createMonth error:', error); return false; }
    Utils.notifyDataChanged();
    return true;
  },

  // ── Loans ─────────────────────────────────────────────────────────────
  async getLoans(userId) {
    const { data, error } = await getSB().from('loans').select('*').eq('user_id', userId);
    if (error) { console.error('getLoans error:', error); return []; }
    return (data || []).map(r => ({
      _id: r.id, id: r.loan_ref || r.id, name: r.name, bank: r.bank || '',
      principal: r.principal || 0, outstanding: r.outstanding || 0, emi: r.emi || 0,
      interestRate: r.interest_rate || 0, tenure: r.tenure || 0,
      emisPaid: r.emis_paid || 0, emisRemaining: r.emis_remaining || 0,
      startDate: r.start_date, endDate: r.end_date, emiStartDate: r.emi_start_date,
      netDisbursed: r.net_disbursed || 0, paymentHistory: r.payment_history || []
    }));
  },

  async saveLoan(userId, loan) {
    const sb = getSB();
    const tenure = Number(loan.tenure) || 0;
    const paid   = Number(loan.emisPaid) || 0;
    const payload = {
      user_id: userId, loan_ref: loan.id, name: loan.name, bank: loan.bank || '',
      principal: Number(loan.principal) || 0, outstanding: Number(loan.outstanding) || 0,
      emi: Number(loan.emi) || 0, interest_rate: Number(loan.interestRate) || 0,
      tenure, emis_paid: paid, emis_remaining: tenure - paid,
      start_date: loan.startDate || null, end_date: loan.endDate || null,
      emi_start_date: loan.emiStartDate || null,
      net_disbursed: Number(loan.netDisbursed) || 0,
      payment_history: loan.paymentHistory || []
    };
    if (loan._id) {
      const { error } = await sb.from('loans').update(payload).eq('id', loan._id);
      if (error) { console.error('saveLoan update error:', error); return false; }
    } else {
      const { data, error } = await sb.from('loans').insert(payload).select().single();
      if (error) { console.error('saveLoan insert error:', error); return false; }
      loan._id = data.id;
    }
    Utils.notifyDataChanged();
    return true;
  },

  async deleteLoan(userId, loanId) {
    const { error } = await getSB().from('loans').delete().eq('id', loanId).eq('user_id', userId);
    if (error) { console.error('deleteLoan error:', error); return false; }
    Utils.notifyDataChanged();
    return !error;
  },

  // FIX: previously "Mark EMI Paid" only updated the loans row — the payment
  // never appeared as a monthly expense, so dashboard balance, reports and
  // CSV export silently ignored real money leaving the account. This now
  // also writes a paid month_expenses row (source: 'loan') for the month
  // the payment falls in, in the same operation.
  async payLoanEmi(userId, loan, { amount, date, note }) {
    const mi = (loan.interestRate || 0) / 100 / 12;
    const interest = loan.outstanding * mi;
    const principal = Math.max(0, amount - interest);
    const newOutstanding = Math.max(0, loan.outstanding - principal);
    const newEmisPaid = (loan.emisPaid || 0) + 1;
    const newEmisRemaining = Math.max(0, (loan.emisRemaining || 0) - 1);
    const history = [...(loan.paymentHistory || []), { date, amount, note }];

    const d = new Date(loan.emiStartDate || new Date());
    d.setMonth(d.getMonth() + 1);
    const nextEmiDate = d.toISOString().split('T')[0];

    const ok = await this.saveLoan(userId, {
      ...loan, outstanding: newOutstanding, emisPaid: newEmisPaid,
      emisRemaining: newEmisRemaining, paymentHistory: history, emiStartDate: nextEmiDate
    });
    if (!ok) return false;

    const mk = Utils.monthKey(new Date(date));
    const created = await this.addExpense(userId, mk, { name: loan.name, planned: loan.emi, isIncome: false, source: 'loan', note: note || 'EMI payment' });
    if (created) await this.updateExpense(userId, created.id, { actual: amount, status: 'paid', date, note: note || 'EMI payment' });

    Utils.notifyDataChanged();
    return true;
  },

  // ── Credit Cards ──────────────────────────────────────────────────────
  async getCards(userId) {
    const { data, error } = await getSB().from('credit_cards').select('*').eq('user_id', userId);
    if (error) { console.error('getCards error:', error); return []; }
    return (data || []).map(r => ({
      id: r.id, name: r.name, bank: r.bank || '',
      limit: r.limit_amount || 0, outstanding: r.outstanding || 0,
      dueDate: r.due_date
    }));
  },

  async saveCard(userId, card) {
    const sb = getSB();
    const payload = {
      user_id: userId, name: card.name, bank: card.bank || '',
      limit_amount: Number(card.limit) || 0,
      outstanding:  Number(card.outstanding) || 0,
      due_date:     card.dueDate || null
    };
    if (card.id) {
      const { error } = await sb.from('credit_cards').update(payload).eq('id', card.id).eq('user_id', userId);
      if (error) { console.error('saveCard update error:', error); return false; }
    } else {
      const { error } = await sb.from('credit_cards').insert(payload);
      if (error) { console.error('saveCard insert error:', error); return false; }
    }
    Utils.notifyDataChanged();
    return true;
  },

  async deleteCard(userId, cardId) {
    const { error } = await getSB().from('credit_cards').delete().eq('id', cardId).eq('user_id', userId);
    if (error) { console.error('deleteCard error:', error); return false; }
    Utils.notifyDataChanged();
    return !error;
  },

  // FIX: same sync gap as loans — a card payment now also logs a paid expense.
  async payCard(userId, card, { amount, date, note }) {
    const newOutstanding = Math.max(0, (card.outstanding || 0) - amount);
    const ok = await this.saveCard(userId, { ...card, outstanding: newOutstanding });
    if (!ok) return false;

    const mk = Utils.monthKey(new Date(date));
    const name = `${card.name} Payment`;
    const created = await this.addExpense(userId, mk, { name, planned: amount, isIncome: false, source: 'credit_card', note: note || '' });
    if (created) await this.updateExpense(userId, created.id, { actual: amount, status: 'paid', date, note: note || '' });

    Utils.notifyDataChanged();
    return true;
  },

  // ── Settings ──────────────────────────────────────────────────────────
  async getSettings(userId) {
    const { data } = await getSB().from('profiles').select('theme').eq('id', userId).single();
    return data || { theme: 'dark' };
  }
};
