import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

function applyDomTheme(theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  document.documentElement.classList.toggle('dark', theme !== 'light');
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState(() => localStorage.getItem('fcc-theme') || 'dark');

  // FIX: previously the saved theme was written to Supabase `profiles.theme`
  // but never read back, so a second device always fell back to localStorage
  // (or the dark default). Now we pull the cloud value once per login and
  // let it win if it differs from what's stored locally.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('theme')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (cancelled || !data?.theme) return;
        setThemeState(data.theme);
        localStorage.setItem('fcc-theme', data.theme);
        applyDomTheme(data.theme);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    applyDomTheme(theme);
  }, [theme]);

  function setTheme(t) {
    setThemeState(t);
    localStorage.setItem('fcc-theme', t);
    if (user) {
      supabase
        .from('profiles')
        .upsert({ id: user.id, theme: t }, { onConflict: 'id' })
        .then(() => {})
        .catch(() => {});
    }
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
