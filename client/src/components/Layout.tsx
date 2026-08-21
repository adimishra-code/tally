import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const { data: alerts } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const { data } = await api.get('/alerts?status=ACTIVE');
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
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
    { path: '/purchase-orders', label: 'Purchase Orders', icon: '📥' },
    { path: '/sales-orders', label: 'Sales Orders', icon: '📤' },
    { path: '/alerts', label: 'Alerts', icon: '🔔', badge: activeAlerts.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-900">Tally</h1>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative px-4 py-2 rounded-lg font-medium transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                      {item.badge && item.badge > 0 && (
                        <span className={`ml-2 px-2 py-0.5 text-xs font-bold rounded-full ${
                          highSeverityCount > 0
                            ? 'bg-red-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* High severity alert banner */}
        {highSeverityCount > 0 && (
          <div className="bg-red-50 border-t border-red-200 px-6 py-2">
            <p className="text-sm text-red-800">
              ⚠️ <strong>{highSeverityCount}</strong> high-priority alert{highSeverityCount !== 1 ? 's' : ''} require attention
            </p>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
