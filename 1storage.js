// storage.js - Persistent storage layer

const Storage = (() => {
  const KEYS = {
    LOANS: 'fcc_loans',
    CREDIT_CARDS: 'fcc_credit_cards',
    MONTHS: 'fcc_months',
    SETTINGS: 'fcc_settings',
    INITIALIZED: 'fcc_initialized',
  };

  function get(key) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  }

  function getLoans() { return get(KEYS.LOANS) || []; }
  function saveLoans(loans) { return set(KEYS.LOANS, loans); }

  function getCreditCards() { return get(KEYS.CREDIT_CARDS) || []; }
  function saveCreditCards(cards) { return set(KEYS.CREDIT_CARDS, cards); }

  function getMonths() { return get(KEYS.MONTHS) || {}; }
  function saveMonths(months) { return set(KEYS.MONTHS, months); }

  function getSettings() {
    return get(KEYS.SETTINGS) || { theme: 'dark', currency: '₹' };
  }
  function saveSettings(s) { return set(KEYS.SETTINGS, s); }

  function isInitialized() { return !!get(KEYS.INITIALIZED); }
  function markInitialized() { return set(KEYS.INITIALIZED, true); }

  function reset() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  // Initialize from MASTER_DATA on first load
  function initFromMaster() {
    if (isInitialized()) return;
    saveLoans(MASTER_DATA.loans);
    saveCreditCards(MASTER_DATA.creditCards);

    // Convert monthly plan array to keyed object with transaction tracking
    const months = {};
    MASTER_DATA.monthlyPlan.months.forEach(m => {
      months[m.key] = {
        ...m,
        incomeActual: null,
        incomeStatus: 'expected', // expected | received
        incomeDate: null,
        incomeNote: '',
        expenseItems: Object.entries(m.expenses).map(([name, planned]) => ({
          id: `${m.key}_${name.replace(/\s+/g,'_')}`,
          name,
          planned,
          actual: null,
          status: 'pending', // pending | paid | skipped
          date: null,
          note: '',
        }))
      };
    });
    saveMonths(months);
    markInitialized();
  }

  return { getLoans, saveLoans, getCreditCards, saveCreditCards,
           getMonths, saveMonths, getSettings, saveSettings,
           isInitialized, initFromMaster, reset, KEYS };
})();
