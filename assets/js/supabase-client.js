// supabase-client.js
const SUPABASE_URL = 'https://prfksddisksdaoprxjki.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByZmtzZGRpc2tzZGFvcHJ4amtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjcyNDQsImV4cCI6MjA5ODI0MzI0NH0.Ku3eQX4OpCIlCBlTTezC23W29sI-V9k8vAbO4B4rnZc';

let _sb = null;
function getSB() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

// ── Auth ──────────────────────────────────────────────────────────────────
const Auth = {
  async signUp(email, password) {
    const { data, error } = await getSB().auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  async signIn(email, password) {
    const { data, error } = await getSB().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut() {
    await getSB().auth.signOut();
    const base = location.pathname.replace(/\/[^/]*$/, '/');
    location.href = base + 'login.html';
  },
  async getUser() {
    const { data: { user } } = await getSB().auth.getUser();
    return user;
  },
  async requireAuth() {
    const user = await this.getUser();
    if (!user) {
      const base = location.pathname.replace(/\/[^/]*$/, '/');
      location.href = base + 'login.html';
      return null;
    }
    return user;
  },
  async resetPassword(email) {
    const base = location.origin + location.pathname.replace(/\/[^/]*$/, '/');
    const { error } = await getSB().auth.resetPasswordForEmail(email, {
      redirectTo: base + 'login.html'
    });
    if (error) throw error;
  }
};
