import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

export default function Dashboard() {
  const [showScanner, setShowScanner] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/summary');
      return data;
    },
    refetchInterval: 15000,
  });

  const kpis = [
    {
      label: 'Catalog Products',
      value: summary?.totalProducts ?? 0,
      subtext: `${summary?.totalWarehouses ?? 0} active locations`,
      icon: '📦',
      color: 'from-blue-500 to-blue-600',
      link: '/products',
    },
    {
      label: 'Inbound POs',
      value: summary?.openPOs ?? 0,
      subtext: `${summary?.pendingApprovals ?? 0} pending approval`,
      icon: '📥',
      color: 'from-emerald-500 to-emerald-600',
      link: '/purchase-orders',
    },
    {
      label: 'Outbound SOs',
      value: summary?.openSOs ?? 0,
      subtext: `${summary?.readyToPick ?? 0} to pick • ${summary?.readyToShip ?? 0} to ship`,
      icon: '📤',
      color: 'from-purple-500 to-purple-600',
      link: '/sales-orders',
    },
    {
      label: 'Active Alerts',
      value: summary?.activeAlertsCount ?? 0,
      subtext: 'Stock & SLA notices',
      icon: '🔔',
      color: 'from-amber-500 to-amber-600',
      link: '/alerts',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header with quick scanner button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Operations Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">Real-time telemetry, warehouse inventory, and fulfillment pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm text-sm flex items-center gap-2"
          >
            <span>⚡</span> Scan Barcode
          </button>
          <Link
            to="/inventory"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-sm text-sm flex items-center gap-1.5"
          >
            <span>📦</span> Stock Ledger
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            to={kpi.link}
            className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                <p className="text-3xl font-black text-gray-900 mt-1">
                  {isLoading ? '...' : kpi.value}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{kpi.subtext}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                {kpi.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pipeline Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outbound Fulfillment Velocity */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚚</span>
              <h3 className="font-bold text-gray-900 text-base">Outbound Fulfillment Funnel</h3>
            </div>
            <Link to="/sales-orders" className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              View All SOs →
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {[
              { label: 'Draft', key: 'DRAFT', bg: 'bg-gray-100 text-gray-800' },
              { label: 'Confirmed', key: 'CONFIRMED', bg: 'bg-blue-100 text-blue-800' },
              { label: 'Picking', key: 'PICKING', bg: 'bg-yellow-100 text-yellow-800' },
              { label: 'Packed', key: 'PACKED', bg: 'bg-purple-100 text-purple-800' },
              { label: 'Shipped', key: 'SHIPPED', bg: 'bg-indigo-100 text-indigo-800' },
              { label: 'Delivered', key: 'DELIVERED', bg: 'bg-emerald-100 text-emerald-800' },
            ].map((step) => {
              const count = summary?.soStatusCounts?.[step.key] || 0;
              return (
                <div key={step.key} className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 space-y-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase block ${step.bg}`}>
                    {step.label}
                  </span>
                  <p className="text-xl font-black text-gray-900">{count}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inbound Procurement Pipeline */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📥</span>
              <h3 className="font-bold text-gray-900 text-base">Inbound Procurement Pipeline</h3>
            </div>
            <Link to="/purchase-orders" className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              View All POs →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            {[
              { label: 'Draft', key: 'DRAFT', bg: 'bg-gray-100 text-gray-800' },
              { label: 'Pending Appr', key: 'PENDING_APPROVAL', bg: 'bg-amber-100 text-amber-800' },
              { label: 'Approved', key: 'APPROVED', bg: 'bg-blue-100 text-blue-800' },
              { label: 'Sent', key: 'SENT', bg: 'bg-purple-100 text-purple-800' },
              { label: 'Received', key: 'RECEIVED', bg: 'bg-emerald-100 text-emerald-800' },
            ].map((step) => {
              const count = summary?.poStatusCounts?.[step.key] || 0;
              return (
                <div key={step.key} className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 space-y-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase block ${step.bg}`}>
                    {step.label}
                  </span>
                  <p className="text-xl font-black text-gray-900">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-time Alerts & Recent Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              <h3 className="font-bold text-gray-900 text-base">Active Operational Alerts</h3>
            </div>
            <Link to="/alerts" className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Alerts Desk →
            </Link>
          </div>

          <div className="space-y-2.5">
            {!summary?.activeAlerts || summary.activeAlerts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                ✅ All systems operating normally. No active alerts.
              </div>
            ) : (
              summary.activeAlerts.slice(0, 5).map((alert: any) => (
                <div
                  key={alert._id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-sm ${
                    alert.severity === 'high'
                      ? 'bg-red-50/70 border-red-200 text-red-900'
                      : alert.severity === 'medium'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-blue-50/70 border-blue-200 text-blue-900'
                  }`}
                >
                  <div>
                    <p className="font-medium text-xs leading-relaxed">{alert.message}</p>
                    <p className="text-[10px] opacity-70 mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-white/80 shrink-0">
                    {alert.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time Audit Stream */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h3 className="font-bold text-gray-900 text-base">Live Audit Stream</h3>
            </div>
            <Link to="/audit" className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Full Audit Trail →
            </Link>
          </div>

          <div className="space-y-2.5 divide-y divide-gray-100">
            {!summary?.recentActivity || summary.recentActivity.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No recent activity recorded yet.</div>
            ) : (
              summary.recentActivity.map((activity: any) => (
                <div key={activity._id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {activity.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-400 font-mono text-[10px]">
                        [{activity.entityType}]
                      </span>
                    </div>
                    <p className="text-gray-500 mt-0.5 text-[11px]">
                      By {activity.userId?.name || 'System Auto'} • {new Date(activity.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="font-mono text-gray-400 text-[10px] truncate max-w-[100px]">
                    {activity.entityId?.slice(-6)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Dock */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4">
        <div>
          <h3 className="text-xl font-bold">Quick Operations Center</h3>
          <p className="text-gray-400 text-xs mt-0.5">Accelerate daily warehouse workflows with one click</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <Link
            to="/purchase-orders"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md transition-all text-center space-y-1.5 border border-white/10"
          >
            <span className="text-2xl block">📥</span>
            <span className="text-xs font-semibold block">Create PO</span>
          </Link>
          <Link
            to="/sales-orders"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md transition-all text-center space-y-1.5 border border-white/10"
          >
            <span className="text-2xl block">📤</span>
            <span className="text-xs font-semibold block">Fulfill SO</span>
          </Link>
          <Link
            to="/inventory"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md transition-all text-center space-y-1.5 border border-white/10"
          >
            <span className="text-2xl block">📦</span>
            <span className="text-xs font-semibold block">Adjust Stock</span>
          </Link>
          <Link
            to="/warehouses"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md transition-all text-center space-y-1.5 border border-white/10"
          >
            <span className="text-2xl block">🏢</span>
            <span className="text-xs font-semibold block">Manage Bins</span>
          </Link>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
