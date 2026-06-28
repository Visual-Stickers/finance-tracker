// storage.js - Storage layer (Supabase backend)
// Replaces the old localStorage-based storage.js

const Storage = (() => {

  // ─── MONTHS ──────────────────────────────────────────────────────────────

  async function getMonths() {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return {};

    const { data: monthRows, error: mErr } = await sb
      .from('months')
      .select('*')
      .eq('user_id', user.id);

    const { data: expRows, error: eErr } = await sb
      .from('month_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (mErr || eErr) {
      console.error('getMonths error', mErr || eErr);
      return {};
    }

    // Build the same keyed object structure the app expects
    const months = {};
    (monthRows || []).forEach(m => {
      months[m.month_key] = {
        key: m.month_key,
        label: m.label,
        income: m.income,
        incomeActual: m.income_actual,
        incomeStatus: m.income_status,
        incomeDate: m.income_date,
        incomeNote: m.income_note,
        balance: m.balance,
        // additional income sources
        additionalIncomes: [],
        expenseItems: []
      };
    });

    // Attach expenses
    (expRows || []).forEach(e => {
      if (months[e.month_key]) {
        months[e.month_key].expenseItems.push({
          id: e.id,
          name: e.name,
          planned: e.planned,
          actual: e.actual,
          status: e.status,
          date: e.date,
          note: e.note,
          sort_order: e.sort_order
        });
      }
    });

    return months;
  }

  async function saveMonthIncome(monthKey, { incomeActual, incomeStatus, incomeDate, incomeNote, income }) {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return false;

    const payload = {};
    if (incomeActual !== undefined) payload.income_actual = incomeActual;
    if (incomeStatus !== undefined) payload.income_status = incomeStatus;
    if (incomeDate !== undefined) payload.income_date = incomeDate || null;
    if (incomeNote !== undefined) payload.income_note = incomeNote;
    if (income !== undefined) payload.income = income;

    const { error } = await sb
      .from('months')
      .update(payload)
      .eq('user_id', user.id)
      .eq('month_key', monthKey);

    if (error) { console.error('saveMonthIncome error', error); return false; }
    return true;
  }

  async function saveExpenseItem(expenseId, fields) {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return false;

    const payload = {};
    if (fields.actual !== undefined) payload.actual = fields.actual;
    if (fields.status !== undefined) payload.status = fields.status;
    if (fields.date !== undefined) payload.date = fields.date || null;
    if (fields.note !== undefined) payload.note = fields.note;
    if (fields.planned !== undefined) payload.planned = fields.planned;
    if (fields.name !== undefined) payload.name = fields.name;

    const { error } = await sb
      .from('month_expenses')
      .update(payload)
      .eq('id', expenseId)
      .eq('user_id', user.id);

    if (error) { console.error('saveExpenseItem error', error); return false; }
    return true;
  }

  async function addExpenseItem(monthKey, { name, planned, note }) {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return null;

    // Get current max sort_order for this month
    const { data: existing } = await sb
      .from('month_expenses')
      .select('sort_order')
      .eq('user_id', user.id)
      .eq('month_key', monthKey)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order + 1) : 0;

    const { data, error } = await sb
      .from('month_expenses')
      .insert({
        user_id: user.id,
        month_key: monthKey,
        name,
        planned: planned || 0,
        actual: null,
        status: 'pending',
        note: note || '',
        sort_order: nextOrder
      })
      .select()
      .single();

    if (error) { console.error('addExpenseItem error', error); return null; }
    return data;
  }

  async function addIncomeSource(monthKey, { name, planned, note }) {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return null;

    const { data, error } = await sb
      .from('month_expenses')
      .insert({
        user_id: user.id,
        month_key: monthKey,
        name,
        planned: planned || 0,
        actual: null,
        status: 'expected',
        note: note || '',
        sort_order: -1  // negative = income source
      })
      .select()
      .single();

    if (error) { console.error('addIncomeSource error', error); return null; }
    return data;
  }

  async function deleteExpenseItem(expenseId) {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return false;

    const { error } = await sb
      .from('month_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', user.id);

    if (error) { console.error('deleteExpenseItem error', error); return false; }
    return true;
  }

  // Add a brand new month (for infinite navigation)
  async function addMonth(monthKey, { income, label }) {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return false;

    const { error } = await sb
      .from('months')
      .insert({
        user_id: user.id,
        month_key: monthKey,
        label: label || monthKey,
        income: income || 0,
        income_status: 'expected',
        balance: 0
      });

    if (error && error.code !== '23505') { // ignore duplicate
      console.error('addMonth error', error);
      return false;
    }
    return true;
  }

  // ─── LOANS ───────────────────────────────────────────────────────────────

  async function getLoans() {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return [];

    const { data, error } = await sb
      .from('loans')
      .select('*')
      .eq('user_id', user.id);

    if (error) { console.error('getLoans error', error); return []; }

    return (data || []).map(l => ({
      id: l.loan_ref || l.id,
      _supabaseId: l.id,
      name: l.name,
      bank: l.bank,
      principal: l.principal,
      netDisbursed: l.net_disbursed,
      outstanding: l.outstanding,
      emi: l.emi,
      interestRate: l.interest_rate,
      apr: l.apr,
      totalInterest: l.total_interest,
      totalPayable: l.total_payable,
      tenure: l.tenure,
      emisPaid: l.emis_paid,
      emisRemaining: l.emis_remaining,
      startDate: l.start_date,
      endDate: l.end_date,
      emiStartDate: l.emi_start_date,
      emiEndDate: l.emi_end_date,
      repaymentMode: l.repayment_mode,
      processingFee: l.processing_fee,
      stampDuty: l.stamp_duty,
      insurance: l.insurance,
      bounceCharge: l.bounce_charge,
      paymentHistory: l.payment_history || []
    }));
  }

  async function saveLoan(loan) {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return false;

    const payload = {
      user_id: user.id,
      loan_ref: loan.id,
      name: loan.name,
      bank: loan.bank,
      principal: loan.principal,
      net_disbursed: loan.netDisbursed,
      outstanding: loan.outstanding,
      emi: loan.emi,
      interest_rate: loan.interestRate,
      apr: loan.apr,
      total_interest: loan.totalInterest,
      total_payable: loan.totalPayable,
      tenure: loan.tenure,
      emis_paid: loan.emisPaid,
      emis_remaining: loan.emisRemaining,
      start_date: loan.startDate,
      end_date: loan.endDate,
      emi_start_date: loan.emiStartDate,
      emi_end_date: loan.emiEndDate,
      repayment_mode: loan.repaymentMode,
      processing_fee: loan.processingFee,
      stamp_duty: loan.stampDuty,
      insurance: loan.insurance,
      bounce_charge: loan.bounceCharge,
      payment_history: loan.paymentHistory || []
    };

    if (loan._supabaseId) {
      const { error } = await sb.from('loans').update(payload).eq('id', loan._supabaseId);
      if (error) { console.error('saveLoan update error', error); return false; }
    } else {
      const { error } = await sb.from('loans').insert(payload);
      if (error) { console.error('saveLoan insert error', error); return false; }
    }
    return true;
  }

  // ─── CREDIT CARDS ────────────────────────────────────────────────────────

  async function getCreditCards() {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return [];

    const { data, error } = await sb
      .from('credit_cards')
      .select('*')
      .eq('user_id', user.id);

    if (error) { console.error('getCreditCards error', error); return []; }
    return data || [];
  }

  async function saveCreditCard(card) {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return false;

    const payload = { user_id: user.id, name: card.name, bank: card.bank,
      limit_amount: card.limit, outstanding: card.outstanding, due_date: card.dueDate };

    if (card.id) {
      const { error } = await sb.from('credit_cards').update(payload).eq('id', card.id);
      if (error) { console.error('saveCreditCard error', error); return false; }
    } else {
      const { error } = await sb.from('credit_cards').insert(payload);
      if (error) { console.error('saveCreditCard error', error); return false; }
    }
    return true;
  }

  // ─── SETTINGS / PROFILE ──────────────────────────────────────────────────

  async function getSettings() {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return { theme: 'dark', currency: '₹' };

    const { data, error } = await sb
      .from('profiles')
      .select('theme, currency')
      .eq('id', user.id)
      .single();

    if (error) return { theme: 'dark', currency: '₹' };
    return { theme: data.theme || 'dark', currency: data.currency || '₹' };
  }

  async function saveSettings(settings) {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return false;

    const { error } = await sb
      .from('profiles')
      .update({ theme: settings.theme, currency: settings.currency, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) { console.error('saveSettings error', error); return false; }
    return true;
  }

  // ─── SEED (first-time data from MASTER_DATA) ─────────────────────────────

  async function seedFromMasterData() {
    const sb = getSupabase();
    const user = await Auth.getUser();
    if (!user) return;

    // Check if already seeded
    const { data: existing } = await sb
      .from('months')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existing && existing.length > 0) return; // already seeded

    console.log('Seeding data from MASTER_DATA...');

    // Seed loans
    for (const loan of (MASTER_DATA.loans || [])) {
      await saveLoan(loan);
    }

    // Seed months + expenses
    for (const m of (MASTER_DATA.monthlyPlan?.months || [])) {
      await sb.from('months').insert({
        user_id: user.id,
        month_key: m.key,
        label: m.label,
        income: m.income,
        income_status: 'expected',
        income_actual: null,
        income_date: null,
        income_note: '',
        balance: m.balance
      });

      const expenses = Object.entries(m.expenses).map(([name, planned], idx) => ({
        user_id: user.id,
        month_key: m.key,
        name,
        planned,
        actual: null,
        status: 'pending',
        date: null,
        note: '',
        sort_order: idx
      }));

      if (expenses.length > 0) {
        await sb.from('month_expenses').insert(expenses);
      }
    }

    console.log('Seeding complete!');
  }

  return {
    getMonths, saveMonthIncome, saveExpenseItem,
    addExpenseItem, addIncomeSource, deleteExpenseItem, addMonth,
    getLoans, saveLoan,
    getCreditCards, saveCreditCard,
    getSettings, saveSettings,
    seedFromMasterData
  };
})();
