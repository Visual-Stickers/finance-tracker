// ─── Supabase Configuration ───────────────────────────────────────────────────
const SUPABASE_URL    = 'https://prfksddisksdaoprxjki.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByZmtzZGRpc2tzZGFvcHJ4amtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjcyNDQsImV4cCI6MjA5ODI0MzI0NH0.Ku3eQX4OpCIlCBlTTezC23W29sI-V9k8vAbO4B4rnZc';

// ─── Supabase REST client (no SDK needed) ─────────────────────────────────────
const db = {
  headers: {
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },

  async select(table, params = '') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: this.headers });
    if (!r.ok) throw await r.json();
    return r.json();
  },

  async insert(table, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: this.headers,
      body: JSON.stringify(Array.isArray(data) ? data : [data])
    });
    if (!r.ok) throw await r.json();
    return r.json();
  },

  async update(table, id, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH', headers: this.headers,
      body: JSON.stringify(data)
    });
    if (!r.ok) throw await r.json();
    return r.json();
  },

  async delete(table, id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE', headers: this.headers
    });
    if (!r.ok) throw await r.json();
    return true;
  },

  async upsert(table, data) {
    const h = { ...this.headers, 'Prefer': 'resolution=merge-duplicates,return=representation' };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: h,
      body: JSON.stringify(Array.isArray(data) ? data : [data])
    });
    if (!r.ok) throw await r.json();
    return r.json();
  }
};
