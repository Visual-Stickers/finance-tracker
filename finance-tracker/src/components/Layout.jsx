import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'fa-gauge-high', end: true },
  { to: '/income-expense', label: 'Income & Expense', shortLabel: 'Cashflow', icon: 'fa-arrows-left-right' },
  { to: '/loans', label: 'Loans', icon: 'fa-landmark' },
  { to: '/credit-cards', label: 'Credit Cards', shortLabel: 'Cards', icon: 'fa-credit-card' },
  { to: '/reports', label: 'Reports', icon: 'fa-chart-pie' },
  { to: '/settings', label: 'Settings', icon: 'fa-gear' },
];

export default function Layout({ children }) {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [date, setDate] = useState('');

  useEffect(() => {
    setDate(new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {/* Top bar */}
      <nav className="sticky top-0 z-40 flex items-center gap-2 px-3 md:px-5 h-14 border-b border-border bg-bg2/95 backdrop-blur">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-sm shrink-0">
          <span className="w-8 h-8 rounded-s bg-blue/15 text-blue flex items-center justify-center">
            <i className="fa fa-chart-line" />
          </span>
          <span className="hidden sm:inline">Finance Command Center</span>
        </NavLink>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-0.5 ml-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-s text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive ? 'text-blue bg-blue/10' : 'text-text2 hover:text-text1 hover:bg-bg3'
                  }`
                }
              >
                <i className={`fa ${item.icon}`} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden lg:inline text-xs text-text3 whitespace-nowrap">{date}</span>
          <button className="btn-icon" onClick={toggleTheme} title="Toggle theme">
            <i className={`fa ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
            <i className="fa fa-right-from-bracket" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="page max-w-[1320px] mx-auto px-3 py-5 md:px-5 md:py-6">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-6 border-t border-border bg-bg2/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold ${
                isActive ? 'text-blue' : 'text-text3'
              }`
            }
          >
            <i className={`fa ${item.icon} text-[15px]`} />
            <span className="truncate max-w-[56px]">{item.shortLabel || item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
