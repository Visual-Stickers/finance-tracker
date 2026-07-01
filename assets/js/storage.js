// storage.js - All Supabase DB operations
const DB = {

  // ── Seed ────────────────────────────────────────────────────────────
  async seed(userId) {
    const sb = getSB();
    const { data } = await sb.from('months').select('id').eq('user_id', userId).limit(1);
    if (data && data.length > 0) return;

    for (const l of MASTER_DATA.loans) {
      await sb.from('loans').insert({
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
      });
    }

    for (const m of MASTER_DATA.months) {
      await sb.from('months').insert({
        user_id: userId, month_key: m.key, label: m.label,
        income: m.income, income_status: 'expected', balance: m.balance
      });
      const exps = Object.entries(m.expenses).map(([name, planned], i) => ({
        user_id: userId, month_key: m.key, name, planned,
        status: 'pending', sort_order: i, is_income: false
      }));
      if (exps.length) await sb.from('month_expenses').insert(exps);
    }
  },

  // ── Months ───────────────────────────────────────────────────────────
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
        date: e.date, note: e.note, sort_order: e.sort_order
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
    if (fields.income       !== undefined) patch.income        = Number(fields.income)       || 0;
    if (fields.incomeActual !== undefined) patch.income_actual = Number(fields.incomeActual) || 0;
    if (fields.incomeStatus !== undefined) patch.income_status = fields.incomeStatus;
    if (fields.incomeDate   !== undefined) patch.income_date   = fields.incomeDate || null;
    if (fields.incomeNote   !== undefined) patch.income_note   = fields.incomeNote || '';
    const { error } = await sb.from('months').update(patch).eq('user_id', userId).eq('month_key', monthKey);
    if (error) { console.error('saveMonthIncome error:', error); return false; }
    // Notify other tabs/pages of data change
    if (!error && typeof Utils !== 'undefined') Utils.notifyDataChanged();
    return true;
  },

  async addExpense(userId, monthKey, { name, planned, note, isIncome }) {
    const sb = getSB();
    await this.upsertMonth(userId, monthKey);
    
    // Validate income data
    if (isIncome) {
      const plannedNum = Number(planned) || 0;
      if (plannedNum <= 0) {
        console.error('Income amount must be greater than 0');
        return null;
      }
    }
    
    const { data: existing } = await sb.from('month_expenses')
      .select('sort_order').eq('user_id', userId).eq('month_key', monthKey)
      .eq('is_income', !!isIncome).order('sort_order', { ascending: false }).limit(1);
    const nextOrder = existing?.length ? existing[0].sort_order + 1 : 0;
    const { data, error } = await sb.from('month_expenses').insert({
      user_id: userId, month_key: monthKey, name,
      planned: Number(planned) || 0, actual: null,
      status: isIncome ? 'expected' : 'pending',
      note: note || '', sort_order: nextOrder, is_income: !!isIncome
    }).select().single();
    if (error) { console.error('addExpense error:', error); return null; }
    // Notify other tabs/pages of data change
    if (typeof Utils !== 'undefined') Utils.notifyDataChanged();
    return data;
  },

  async updateExpense(userId, expId, fields) {
    const sb = getSB();
    const patch = {};
    if (fields.actual  !== undefined) {
      const actualNum = Number(fields.actual);
      // Validation: actual cannot be negative
      if (!isNaN(actualNum) && actualNum < 0) {
        console.error('Actual amount cannot be negative');
        return false;
      }
      patch.actual = fields.actual !== null ? actualNum : null;
    }
    if (fields.status  !== undefined) patch.status  = fields.status;
    if (fields.date    !== undefined) patch.date    = fields.date || null;
    if (fields.note    !== undefined) patch.note    = fields.note || '';
    if (fields.planned !== undefined) patch.planned = Number(fields.planned) || 0;
    if (fields.name    !== undefined) patch.name    = fields.name;
    const { error } = await sb.from('month_expenses').update(patch).eq('id', expId).eq('user_id', userId);
    if (error) { console.error('updateExpense error:', error); return false; }
    // Notify other tabs/pages of data change
    if (typeof Utils !== 'undefined') Utils.notifyDataChanged();
    return true;
  },

  async deleteExpense(userId, expId) {
    const { error } = await getSB().from('month_expenses').delete().eq('id', expId).eq('user_id', userId);
    if (error) console.error('deleteExpense error:', error);
    // Notify other tabs/pages of data change
    if (!error && typeof Utils !== 'undefined') Utils.notifyDataChanged();
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
    // Notify other tabs/pages of data change
    if (!error && typeof Utils !== 'undefined') Utils.notifyDataChanged();
    return true;
  },

  // ── Loans ───────────────────────────────────────────────────────────
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
    const tenure  = Number(loan.tenure)  || 0;
    const paid    = Number(loan.emisPaid)|| 0;
    const payload = {
      user_id: userId,
      loan_ref: loan.id,
      name: loan.name,
      bank: loan.bank || '',
      principal:      Number(loan.principal)    || 0,
      outstanding:    Number(loan.outstanding)  || 0,
      emi:            Number(loan.emi)          || 0,
      interest_rate:  Number(loan.interestRate) || 0,
      tenure:         tenure,
      emis_paid:      paid,
      emis_remaining: tenure - paid,
      start_date:     loan.startDate    || null,
      end_date:       loan.endDate      || null,
      emi_start_date: loan.emiStartDate || null,
      net_disbursed:  Number(loan.netDisbursed) || 0,
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
    // Notify other tabs/pages of data change
    if (typeof Utils !== 'undefined') Utils.notifyDataChanged();
    return true;
  },

  async deleteLoan(userId, loanId) {
    const { error } = await getSB().from('loans').delete().eq('id', loanId).eq('user_id', userId);
    if (error) console.error('deleteLoan error:', error);
    // Notify other tabs/pages of data change
    if (!error && typeof Utils !== 'undefined') Utils.notifyDataChanged();
    return !error;
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
    // Only include columns that exist in the DB schema
    const payload = {
      user_id:      userId,
      name:         card.name,
      bank:         card.bank || '',
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
    // Notify other tabs/pages of data change
    if (typeof Utils !== 'undefined') Utils.notifyDataChanged();
    return true;
  },

  async deleteCard(userId, cardId) {
    const { error } = await getSB().from('credit_cards').delete().eq('id', cardId).eq('user_id', userId);
    if (error) console.error('deleteCard error:', error);
    // Notify other tabs/pages of data change
    if (!error && typeof Utils !== 'undefined') Utils.notifyDataChanged();
    return !error;
  },

  // ── Settings ──────────────────────────────────────────────────────────
  async getSettings(userId) {
    const { data } = await getSB().from('profiles').select('theme').eq('id', userId).single();
    return data || { theme: 'dark' };
  }
};
