import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ msg: '', type: 'success', show: false });
  const timer = useRef(null);

  const show = useCallback((msg, type = 'success') => {
    clearTimeout(timer.current);
    setToast({ msg, type, show: true });
    timer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type === 'error' ? 'error' : ''}`}>
        {toast.msg}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
