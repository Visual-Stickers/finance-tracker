// supabase-client.js - Supabase connection & auth
// Place this in assets/js/supabase-client.js

const SUPABASE_URL = 'https://prfksddisksdaoprxjki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByZmtzZGRpc2tzZGFvcHJ4amtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjcyNDQsImV4cCI6MjA5ODI0MzI0NH0.Ku3eQX4OpCIlCBlTTezC23W29sI-V9k8vAbO4B4rnZc';

// Load Supabase via CDN (added to HTML head)
let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

const Auth = (() => {

  async function signUp(email, password) {
    const { data, error } = await getSupabase().auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
    window.location.href = 'login.html';
  }

  async function getUser() {
    const { data: { user } } = await getSupabase().auth.getUser();
    return user;
  }

  async function getSession() {
    const { data: { session } } = await getSupabase().auth.getSession();
    return session;
  }

  // Call this at top of every protected page
  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session.user;
  }

  async function resetPassword(email) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html'
    });
    if (error) throw error;
  }

  return { signUp, signIn, signOut, getUser, getSession, requireAuth, resetPassword };
})();
