import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/inventory', label: 'Inventory', icon: '📦' },
    { path: '/products', label: 'Products', icon: '🏷️' },
    { path: '/warehouses', label: 'Warehouses', icon: '🏢' },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: '📥' },
    { path: '/sales-orders', label: 'Sales Orders', icon: '📤' },
    { path: '/alerts', label: 'Alerts', icon: '🔔', badge: activeAlerts.length },
    { path: '/audit', label: 'Audit Log', icon: '📋' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Logo & Live Status */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? '✕' : '☰'}
                </button>
                <Link to="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                    T
                  </div>
                  <span className="text-xl font-extrabold text-gray-900 tracking-tight">Tally</span>
                </Link>

                <div
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    isConnected
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                  title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to WebSocket...'}
                >
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  {isConnected ? 'Live Sync' : 'Offline'}
                </div>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full ${
                            highSeverityCount > 0
                              ? 'bg-red-500 text-white'
                              : 'bg-amber-500 text-white'
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

            {/* User Profile & Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-semibold text-gray-900">{user.name || 'User'}</div>
                <div className="text-xs text-gray-500 capitalize">{user.role?.toLowerCase() || 'staff'}</div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-150">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        highSeverityCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
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

        {/* High severity alert banner */}
        {highSeverityCount > 0 && (
          <div className="bg-red-50 border-t border-red-200 px-6 py-2">
            <p className="text-sm text-red-800 flex items-center gap-2">
              <span>🚨</span>
              <span>
                <strong>{highSeverityCount}</strong> high-priority alert{highSeverityCount !== 1 ? 's' : ''} require immediate resolution.
              </span>
            </p>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
