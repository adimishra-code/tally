import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await api.get('/alerts?status=ACTIVE');
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
  });

  const lowStockAlerts = alerts?.filter((a: any) => a.type === 'LOW_STOCK') || [];
  const expiryAlerts = alerts?.filter((a: any) => a.type === 'EXPIRY_WARNING') || [];
  const slaAlerts = alerts?.filter((a: any) => a.type === 'SLA_BREACH') || [];

  const stats = [
    { label: 'Total Products', value: products?.length || 0, color: 'bg-blue-500', link: '/products' },
    { label: 'Low Stock Items', value: lowStockAlerts.length, color: 'bg-yellow-500', link: '/alerts' },
    { label: 'Expiry Warnings', value: expiryAlerts.length, color: 'bg-orange-500', link: '/alerts' },
    { label: 'SLA Breaches', value: slaAlerts.length, color: 'bg-red-500', link: '/sales-orders' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Operations Dashboard</h2>
        <p className="text-gray-600">Real-time view of warehouse operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.link}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white text-2xl`}>
                {stat.label.includes('Product') ? '📦' :
                 stat.label.includes('Low') ? '⚠️' :
                 stat.label.includes('Expiry') ? '⏰' : '🚨'}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Active Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
            <Link to="/alerts" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert: any) => (
              <div
                key={alert._id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'high'
                    ? 'bg-red-50 border-red-500'
                    : alert.severity === 'medium'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                    alert.severity === 'high'
                      ? 'bg-red-100 text-red-800'
                      : alert.severity === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/purchase-orders"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-blue-300"
        >
          <div className="text-4xl mb-3">📥</div>
          <h3 className="font-semibold text-gray-900 mb-1">New Purchase Order</h3>
          <p className="text-sm text-gray-600">Create a new inbound purchase order</p>
        </Link>

        <Link
          to="/sales-orders"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-blue-300"
        >
          <div className="text-4xl mb-3">📤</div>
          <h3 className="font-semibold text-gray-900 mb-1">New Sales Order</h3>
          <p className="text-sm text-gray-600">Create a new outbound order</p>
        </Link>

        <Link
          to="/inventory"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-blue-300"
        >
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="font-semibold text-gray-900 mb-1">Check Inventory</h3>
          <p className="text-sm text-gray-600">View real-time stock levels</p>
        </Link>
      </div>
    </div>
  );
}
