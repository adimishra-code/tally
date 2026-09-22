import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';
import CommandPaletteModal from './CommandPaletteModal';
import BarcodeScannerModal from './BarcodeScannerModal';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: alerts } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const { data } = await api.get('/alerts?status=ACTIVE');
      return data;
    },
    refetchInterval: 30000,
  });

  const activeAlerts = alerts?.filter((a: any) => a.status === 'ACTIVE') || [];
  const highSeverityCount = activeAlerts.filter((a: any) => a.severity === 'high').length;

  const handleLogout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.clear();
    navigate('/login');
  };

  const navItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      path: '/inventory',
      label: 'Stock Ledger',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      path: '/products',
      label: 'Products',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      ),
    },
    {
      path: '/warehouses',
      label: 'Warehouses',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M3 21h18" />
          <path d="M5 21V7l8-4v18" />
          <path d="M19 21V11l-6-3" />
          <path d="M9 9v.01" />
          <path d="M9 12v.01" />
          <path d="M9 15v.01" />
          <path d="M9 18v.01" />
        </svg>
      ),
    },
    {
      path: '/purchase-orders',
      label: 'Purchase Orders',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
          <path d="M12 12v9" />
          <path d="m8 17 4 4 4-4" />
        </svg>
      ),
    },
    {
      path: '/sales-orders',
      label: 'Sales Orders',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" rx="1" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    {
      path: '/alerts',
      label: 'Alerts',
      badge: activeAlerts.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      path: '/audit',
      label: 'Audit Trail',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      path: '/users',
      label: 'Staff',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  const userInitials = (user.name || 'User')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#090A0C] text-zinc-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-zinc-950">
      {/* Top Header - Solid Industrial Terminal Bar */}
      <header className="bg-[#0E1014] border-b border-[#232730] sticky top-0 z-50 shadow-md">
        <div className="px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-[#171A21] lg:hidden transition-colors border border-[#232730]"
                aria-label="Toggle navigation menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Logo & Operational Beacon */}
              <div className="flex items-center gap-3">
                <Link to="/" className="flex items-center gap-2.5 group">
                  <div className="w-8 h-8 rounded-lg bg-[#14171E] border border-amber-500/40 text-amber-400 flex items-center justify-center font-mono font-black text-sm shadow-xs group-hover:border-amber-400 transition-colors">
                    TL
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-extrabold tracking-tight text-zinc-100 group-hover:text-amber-400 transition-colors">
                        TALLY
                      </span>
                      <span className="text-[10px] font-mono px-1 py-0.2 bg-[#1A1E26] text-amber-400/90 border border-[#2E3543] rounded font-semibold">
                        OS
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Real-time Socket Telemetry Beacon */}
                <div
                  className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                    isConnected
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                  title={isConnected ? 'Real-time WebSocket connected' : 'WebSocket connecting...'}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-400 led-pulse-emerald animate-pulse' : 'bg-zinc-500'
                    }`}
                  />
                  <span>{isConnected ? 'LIVE_SYNC' : 'DISCONNECTED'}</span>
                </div>
              </div>

              {/* Desktop Nav Items */}
              <nav className="hidden lg:flex items-center gap-0.5 ml-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/30'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#15181F] border border-transparent'
                      }`}
                    >
                      <span className={isActive ? 'text-amber-400' : 'text-zinc-500'}>{item.icon}</span>
                      <span>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`ml-1 px-1.5 py-0.2 text-[9px] font-mono font-bold rounded ${
                            highSeverityCount > 0
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-500 text-zinc-950'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Search Palette & Quick Barcode Action */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCommandPalette(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#13161D] border border-[#232730] hover:border-amber-500/40 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
                title="Search commands and SKUs (Ctrl+K)"
              >
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35" />
                </svg>
                <span className="font-sans">Search (Ctrl+K)...</span>
                <kbd className="ml-1 px-1.5 py-0.2 text-[9px] font-mono font-semibold bg-[#1A1E27] text-zinc-400 border border-[#2B313F] rounded">
                  &prop;K
                </kbd>
              </button>

              <button
                onClick={() => setShowScannerModal(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#14171E] border border-[#262B35] hover:border-amber-500/50 hover:bg-[#181C25] text-amber-400 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-xs btn-tactile"
                title="Quick Barcode Scanner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="hidden sm:inline">SCAN</span>
              </button>

              {/* User Profile & Actions */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#232730]">
                  <div className="w-7 h-7 rounded-md bg-[#161920] border border-[#272B36] text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                    {userInitials}
                  </div>
                  <div className="flex flex-col text-left leading-none">
                    <span className="text-xs font-semibold text-zinc-200">{user.name || 'Staff User'}</span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400/80 font-bold mt-0.5">
                      {user.role || 'STAFF'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 rounded-md border border-[#232730] transition-colors flex items-center gap-1.5"
                  title="Log out of terminal"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#232730] bg-[#0E1014] px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                      : 'text-zinc-300 hover:bg-[#161920]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-amber-400' : 'text-zinc-500'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                        highSeverityCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-zinc-950'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* High Severity Operational Notice Banner */}
        {highSeverityCount > 0 && (
          <div className="bg-[#1C1113] border-t border-rose-900/60 px-6 py-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-rose-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 led-pulse-rose animate-ping shrink-0" />
                <span>
                  <strong className="font-mono font-bold text-rose-200">{highSeverityCount}</strong> critical warehouse alert{highSeverityCount !== 1 ? 's' : ''} require immediate resolution.
                </span>
              </p>
              <Link
                to="/alerts"
                className="text-xs font-mono font-bold text-rose-400 hover:text-rose-300 underline ml-4 shrink-0"
              >
                OPEN_ALERTS_DESK &rarr;
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Global Interactive Modals */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onTriggerScanner={() => setShowScannerModal(true)}
      />

      {showScannerModal && (
        <BarcodeScannerModal onClose={() => setShowScannerModal(false)} />
      )}
    </div>
  );
}
