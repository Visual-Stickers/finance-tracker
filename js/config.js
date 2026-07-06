// ─── Supabase Configuration ───────────────────────────────────────────────────
const SUPABASE_URL    = 'https://prfksddisksdaoprxjki.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByZmtzZGRpc2tzZGFvcHJ4amtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjcyNDQsImV4cCI6MjA5ODI0MzI0NH0.Ku3eQX4OpCIlCBlTTezC23W29sI-V9k8vAbO4B4rnZc';

// ─── Supabase Auth (uses the supabase-js SDK, loaded via CDN in each page) ────
// This is what makes RLS actually scope data per-user: every request below
// now carries the signed-in user's own access token instead of just the
// shared public anon key, so `auth.uid()` resolves correctly in your RLS
// policies (see the updated schema.sql).
const _sbAuth = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const Auth = {
  async getSession() {
    const { data } = await _sbAuth.auth.getSession();
    return data?.session || null;
  },
  async getUser() {
    const session = await this.getSession();
    return session?.user || null;
  },
  signIn(email, password) {
    return _sbAuth.auth.signInWithPassword({ email, password });
  },
  signUp(email, password) {
    return _sbAuth.auth.signUp({ email, password });
  },
  async signOut() {
    await _sbAuth.auth.signOut();
    location.href = 'login.html';
  },
  resetPassword(email) {
    return _sbAuth.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname.replace(/[^/]+$/, 'login.html') });
  },
  // Call at the top of every protected page. Redirects to login.html if
  // there's no session, otherwise returns the session so the page can
  // continue loading.
  async requireSession() {
    const session = await this.getSession();
    if (!session) { location.href = 'login.html'; return null; }
    return session;
  },
};

// ─── Supabase REST client (no SDK needed for data calls) ──────────────────────
const db = {
  async _headers() {
    const session = await Auth.getSession();
    return {
      'apikey': SUPABASE_ANON,
      // FIX: this used to always send the anon key as the bearer token,
      // which means RLS could never tell which user was asking — every
      // signed-in user's requests looked identical to Postgres, and the
      // old schema.sql compensated by leaving policies wide open
      // (`using (true)`), so anyone with this public anon key could read
      // or write anyone's data. Sending the user's own access token here
      // is what lets `auth.uid() = user_id` policies actually work.
      'Authorization': `Bearer ${session ? session.access_token : SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  },

  async select(table, params = '') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: await this._headers() });
    if (!r.ok) throw await r.json();
    return r.json();
  },

  async insert(table, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: await this._headers(),
      body: JSON.stringify(Array.isArray(data) ? data : [data])
    });
    if (!r.ok) throw await r.json();
    return r.json();
  },

  async update(table, id, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH', headers: await this._headers(),
      body: JSON.stringify(data)
    });
    if (!r.ok) throw await r.json();
    return r.json();
  },

  async delete(table, id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE', headers: await this._headers()
    });
    if (!r.ok) throw await r.json();
    return true;
  },

  async upsert(table, data) {
    const h = { ...(await this._headers()), 'Prefer': 'resolution=merge-duplicates,return=representation' };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: h,
      body: JSON.stringify(Array.isArray(data) ? data : [data])
    });
    if (!r.ok) throw await r.json();
    return r.json();
  }
};
