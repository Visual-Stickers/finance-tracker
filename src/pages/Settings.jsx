import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useToast } from '../lib/ToastContext';
import * as api from '../lib/api';
import { nameFromEmail } from '../lib/utils';
import Modal from '../components/Modal';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleReset() {
    if (confirmText !== 'DELETE') { toast('Type DELETE to confirm', 'error'); return; }
    setBusy(true);
    try {
      await api.resetAllData(user.id);
      toast('All data cleared');
      setResetOpen(false);
      setConfirmText('');
      window.location.reload();
    } catch {
      toast('Failed to reset data', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h1 className="text-lg font-bold flex items-center gap-2"><i className="fa fa-gear text-text2" /> Settings</h1>
        <p className="text-text2 text-sm">Manage your account and preferences.</p>
      </div>

      <div className="card mb-4">
        <div className="font-bold text-sm mb-3 flex items-center gap-2"><i className="fa fa-user text-blue" /> Account</div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-blue/15 text-blue flex items-center justify-center font-bold">
            {nameFromEmail(user.email).charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-sm">{nameFromEmail(user.email)}</div>
            <div className="text-xs text-text2">{user.email}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm mt-4" onClick={signOut}><i className="fa fa-right-from-bracket" /> Sign Out</button>
      </div>

      <div className="card mb-4">
        <div className="font-bold text-sm mb-3 flex items-center gap-2"><i className="fa fa-palette text-purple" /> Appearance</div>
        <p className="text-xs text-text2 mb-3">Your theme preference syncs automatically across your devices.</p>
        <div className="flex gap-2">
          <button className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'} flex-1 justify-center`} onClick={() => setTheme('dark')}><i className="fa fa-moon" /> Dark</button>
          <button className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-ghost'} flex-1 justify-center`} onClick={() => setTheme('light')}><i className="fa fa-sun" /> Light</button>
        </div>
      </div>

      <div className="card" style={{ borderColor: 'rgba(248,81,73,0.3)' }}>
        <div className="font-bold text-sm mb-3 flex items-center gap-2 text-red"><i className="fa fa-triangle-exclamation" /> Danger Zone</div>
        <p className="text-xs text-text2 mb-3">Permanently delete all your months, expenses, loans and credit cards. This cannot be undone.</p>
        <button className="btn btn-danger btn-sm" onClick={() => setResetOpen(true)}><i className="fa fa-trash" /> Reset All Data</button>
      </div>

      <Modal
        open={resetOpen} onClose={() => setResetOpen(false)} title="Confirm Data Reset" icon={<i className="fa fa-triangle-exclamation text-red" />}
        footer={<><button className="btn btn-ghost" onClick={() => setResetOpen(false)}>Cancel</button><button className="btn btn-danger" disabled={busy} onClick={handleReset}>{busy ? <span className="spinner" /> : <i className="fa fa-trash" />} Delete Everything</button></>}
      >
        <p className="text-sm text-text2 mb-3">This will permanently delete all of your financial data. Type <strong className="text-red">DELETE</strong> to confirm.</p>
        <input className="form-control" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" />
      </Modal>
    </div>
  );
}
