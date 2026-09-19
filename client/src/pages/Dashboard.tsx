import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import {
  IconPackage,
  IconValuation,
  IconInbox,
  IconTruck,
  IconBell,
  IconScan,
  IconAlertCircle,
  IconCheckCircle,
  IconBuilding,
} from '../components/Icons';

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
      icon: <IconPackage className="w-5 h-5 text-blue-600" />,
      color: 'from-blue-500 to-blue-600',
      link: '/products',
    },
    {
      label: 'Inventory Value',
      value: summary?.totalValuation != null ? `$${Math.round(summary.totalValuation).toLocaleString()}` : '$0',
      subtext: `${summary?.lowStockCount ?? 0} items at reorder point`,
      icon: <IconValuation className="w-5 h-5 text-amber-600" />,
      color: 'from-amber-500 to-amber-600',
      link: '/inventory',
    },
    {
      label: 'Inbound POs',
      value: summary?.openPOs ?? 0,
      subtext: `${summary?.pendingApprovals ?? 0} pending approval`,
      icon: <IconInbox className="w-5 h-5 text-emerald-600" />,
      color: 'from-emerald-500 to-emerald-600',
      link: '/purchase-orders',
    },
    {
      label: 'Outbound SOs',
      value: summary?.openSOs ?? 0,
      subtext: `${summary?.readyToPick ?? 0} to pick • ${summary?.readyToShip ?? 0} to ship`,
      icon: <IconTruck className="w-5 h-5 text-purple-600" />,
      color: 'from-purple-500 to-purple-600',
      link: '/sales-orders',
    },
    {
      label: 'Active Alerts',
      value: summary?.activeAlertsCount ?? 0,
      subtext: 'Stock & SLA notices',
      icon: <IconBell className="w-5 h-5 text-rose-600" />,
      color: 'from-rose-500 to-rose-600',
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
            <IconScan className="w-4 h-4 text-gray-500" />
            <span>Scan Barcode</span>
          </button>
          <Link
            to="/inventory"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-sm text-sm flex items-center gap-1.5"
          >
            <IconPackage className="w-4 h-4" />
            <span>Stock Ledger</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            to={kpi.link}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all hover:-translate-y-0.5 relative overflow-hidden group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                  {isLoading ? '...' : kpi.value}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{kpi.subtext}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
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
              <IconTruck className="w-5 h-5 text-purple-600" />
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
              <IconInbox className="w-5 h-5 text-emerald-600" />
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
              <IconAlertCircle className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-gray-900 text-base">Active Operational Alerts</h3>
            </div>
            <Link to="/alerts" className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Alerts Desk →
            </Link>
          </div>

          <div className="space-y-2.5">
            {!summary?.activeAlerts || summary.activeAlerts.length === 0 ? (
              <div className="p-8 text-center text-emerald-600 text-sm flex items-center justify-center gap-2">
                <IconCheckCircle className="w-5 h-5" />
                <span>All systems operating normally. No active alerts.</span>
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
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md transition-all text-center space-y-2 border border-white/10 flex flex-col items-center justify-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <IconInbox className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold block text-slate-200">Create PO</span>
          </Link>
          <Link
            to="/sales-orders"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md transition-all text-center space-y-2 border border-white/10 flex flex-col items-center justify-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <IconTruck className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold block text-slate-200">Fulfill SO</span>
          </Link>
          <Link
            to="/inventory"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md transition-all text-center space-y-2 border border-white/10 flex flex-col items-center justify-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <IconPackage className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold block text-slate-200">Adjust Stock</span>
          </Link>
          <Link
            to="/warehouses"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md transition-all text-center space-y-2 border border-white/10 flex flex-col items-center justify-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <IconBuilding className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold block text-slate-200">Manage Bins</span>
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
