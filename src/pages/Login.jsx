import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const { user, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [siEmail, setSiEmail] = useState('');
  const [siPass, setSiPass] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suPass2, setSuPass2] = useState('');
  const [fpEmail, setFpEmail] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  function switchTab(t) {
    setTab(t);
    setError('');
    setSuccess('');
  }

  async function handleSignIn(e) {
    e?.preventDefault();
    setError(''); setSuccess('');
    if (!siEmail || !siPass) { setError('Please enter email and password.'); return; }
    setLoading(true);
    try {
      await signIn(siEmail, siPass);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e) {
    e?.preventDefault();
    setError(''); setSuccess('');
    if (!suEmail || !suPass) { setError('Please fill all fields.'); return; }
    if (suPass.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (suPass !== suPass2) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await signUp(suEmail, suPass);
      setSuccess('Account created! Check your email to confirm, then sign in.');
    } catch (err) {
      setError(err.message || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e?.preventDefault();
    setError(''); setSuccess('');
    if (!fpEmail) { setError('Enter your email address.'); return; }
    setLoading(true);
    try {
      await resetPassword(fpEmail);
      setSuccess('Reset link sent! Check your email.');
    } catch (err) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-14 h-14 rounded-m bg-blue/15 text-blue flex items-center justify-center text-2xl">
            <i className="fa fa-chart-line" />
          </div>
          <div className="font-bold text-lg">Finance Command Center</div>
        </div>

        <div className="card">
          <div className="flex mb-4 border border-border rounded-s overflow-hidden">
            <button
              className={`flex-1 py-2 text-sm font-semibold ${tab === 'signin' ? 'bg-blue text-white' : 'text-text2'}`}
              onClick={() => switchTab('signin')}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-2 text-sm font-semibold ${tab === 'signup' ? 'bg-blue text-white' : 'text-text2'}`}
              onClick={() => switchTab('signup')}
            >
              Create Account
            </button>
          </div>

          {error && <div className="mb-3 text-xs text-red bg-red/10 border border-red/30 rounded-s px-3 py-2">{error}</div>}
          {success && <div className="mb-3 text-xs text-green bg-green/10 border border-green/30 rounded-s px-3 py-2">{success}</div>}

          {tab === 'signin' && (
            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" autoComplete="email" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" autoComplete="current-password" value={siPass} onChange={(e) => setSiPass(e.target.value)} placeholder="••••••••" />
              </div>
              <button className="btn btn-primary w-full justify-center" disabled={loading} type="submit">
                {loading ? <span className="spinner" /> : <i className="fa fa-arrow-right-to-bracket" />} Sign In
              </button>
              <div className="text-center mt-3">
                <button type="button" className="text-xs text-blue" onClick={() => switchTab('forgot')}>Forgot password?</button>
              </div>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSignUp}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" autoComplete="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password (min 6 chars)</label>
                <input className="form-control" type="password" autoComplete="new-password" value={suPass} onChange={(e) => setSuPass(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-control" type="password" autoComplete="new-password" value={suPass2} onChange={(e) => setSuPass2(e.target.value)} placeholder="••••••••" />
              </div>
              <button className="btn btn-success w-full justify-center" disabled={loading} type="submit">
                {loading ? <span className="spinner" /> : <i className="fa fa-user-plus" />} Create Account
              </button>
            </form>
          )}

          {tab === 'forgot' && (
            <form onSubmit={handleForgot}>
              <p className="text-xs text-text2 mb-3">Enter your email to receive a reset link.</p>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button className="btn btn-primary w-full justify-center" disabled={loading} type="submit">
                {loading ? <span className="spinner" /> : <i className="fa fa-paper-plane" />} Send Reset Link
              </button>
              <div className="text-center mt-3">
                <button type="button" className="text-xs text-blue" onClick={() => switchTab('signin')}>← Back to Sign In</button>
              </div>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-text3 mt-4">Your data is securely stored in Supabase</p>
      </div>
    </div>
  );
}
