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
  IconClipboard,
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
      label: 'Catalog SKUs',
      value: summary?.totalProducts ?? 0,
      subtext: `${summary?.totalWarehouses ?? 0} active facilities`,
      icon: <IconPackage className="w-5 h-5 text-amber-400" />,
      link: '/products',
      tag: 'ACTIVE_CATALOG',
    },
    {
      label: 'Stock Valuation',
      value: summary?.totalValuation != null ? `$${Math.round(summary.totalValuation).toLocaleString()}` : '$0',
      subtext: `${summary?.lowStockCount ?? 0} items at reorder point`,
      icon: <IconValuation className="w-5 h-5 text-amber-500" />,
      link: '/inventory',
      tag: 'LEDGER_SUM',
    },
    {
      label: 'Inbound POs',
      value: summary?.openPOs ?? 0,
      subtext: `${summary?.pendingApprovals ?? 0} pending authorization`,
      icon: <IconInbox className="w-5 h-5 text-emerald-400" />,
      link: '/purchase-orders',
      tag: 'PROCUREMENT',
    },
    {
      label: 'Outbound SOs',
      value: summary?.openSOs ?? 0,
      subtext: `${summary?.readyToPick ?? 0} to pick • ${summary?.readyToShip ?? 0} to ship`,
      icon: <IconTruck className="w-5 h-5 text-amber-300" />,
      link: '/sales-orders',
      tag: 'DISPATCH',
    },
    {
      label: 'Active Alerts',
      value: summary?.activeAlertsCount ?? 0,
      subtext: 'Operational notices',
      icon: <IconBell className="w-5 h-5 text-rose-400" />,
      link: '/alerts',
      tag: 'TELEMETRY',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 led-pulse-amber" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight font-sans">
              Operations Command
            </h1>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 font-mono">
            Derived stock ledger • Multi-zone fulfillment • Live WebSocket telemetry
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowScanner(true)}
            className="px-3.5 py-2 bg-[#12141A] border border-[#262B35] hover:border-amber-500/50 hover:bg-[#181C24] text-zinc-200 font-mono font-semibold rounded-lg transition-all shadow-xs text-xs flex items-center gap-2 btn-tactile"
          >
            <IconScan className="w-4 h-4 text-amber-400" />
            <span>SCAN_BARCODE</span>
          </button>
          <Link
            to="/inventory"
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-lg transition-all shadow-xs text-xs flex items-center gap-1.5 btn-tactile"
          >
            <IconPackage className="w-4 h-4" />
            <span>STOCK_LEDGER &rarr;</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid - High Density Industrial Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            to={kpi.link}
            className="bg-[#0E1014] hover:bg-[#13161C] rounded-xl p-4 border border-[#232730] hover:border-[#353D4D] transition-all shadow-sm relative overflow-hidden group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                {kpi.label}
              </span>
              <div className="w-7 h-7 rounded-md bg-[#161920] border border-[#262B35] flex items-center justify-center">
                {kpi.icon}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight font-mono">
                {isLoading ? '...' : kpi.value}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 truncate">{kpi.subtext}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1C2028] flex items-center justify-between text-[9px] font-mono text-zinc-500">
              <span>TAG // {kpi.tag}</span>
              <span className="text-amber-400/80 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Pipeline Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Outbound Fulfillment Velocity */}
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#232730] pb-3">
            <div className="flex items-center gap-2">
              <IconTruck className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-zinc-100 text-sm tracking-tight">Outbound Fulfillment Funnel</h2>
            </div>
            <Link to="/sales-orders" className="text-xs font-mono text-amber-400 hover:text-amber-300 font-semibold">
              VIEW_ALL_SOS &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono">
            {[
              { label: 'Draft', key: 'DRAFT', border: 'border-zinc-700 text-zinc-400 bg-zinc-900/60' },
              { label: 'Confirmed', key: 'CONFIRMED', border: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
              { label: 'Picking', key: 'PICKING', border: 'border-amber-600/40 text-amber-400 bg-amber-600/15' },
              { label: 'Packed', key: 'PACKED', border: 'border-zinc-500 text-zinc-200 bg-zinc-800/60' },
              { label: 'Shipped', key: 'SHIPPED', border: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
              { label: 'Delivered', key: 'DELIVERED', border: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40' },
            ].map((step) => {
              const count = summary?.soStatusCounts?.[step.key] || 0;
              return (
                <div key={step.key} className="p-2.5 rounded-lg bg-[#12141A] border border-[#20242D] space-y-1">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase block border ${step.border}`}>
                    {step.label}
                  </span>
                  <p className="text-xl font-bold text-zinc-100">{count}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inbound Procurement Pipeline */}
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#232730] pb-3">
            <div className="flex items-center gap-2">
              <IconInbox className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-zinc-100 text-sm tracking-tight">Inbound Procurement Pipeline</h2>
            </div>
            <Link to="/purchase-orders" className="text-xs font-mono text-amber-400 hover:text-amber-300 font-semibold">
              VIEW_ALL_POS &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
            {[
              { label: 'Draft', key: 'DRAFT', border: 'border-zinc-700 text-zinc-400 bg-zinc-900/60' },
              { label: 'Pending Appr', key: 'PENDING_APPROVAL', border: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
              { label: 'Approved', key: 'APPROVED', border: 'border-zinc-500 text-zinc-200 bg-zinc-800/60' },
              { label: 'Sent', key: 'SENT', border: 'border-amber-600/40 text-amber-400 bg-amber-600/15' },
              { label: 'Received', key: 'RECEIVED', border: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
            ].map((step) => {
              const count = summary?.poStatusCounts?.[step.key] || 0;
              return (
                <div key={step.key} className="p-2.5 rounded-lg bg-[#12141A] border border-[#20242D] space-y-1">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase block border ${step.border}`}>
                    {step.label}
                  </span>
                  <p className="text-xl font-bold text-zinc-100">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-time Alerts & Recent Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Operational Alerts */}
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#232730] pb-3">
            <div className="flex items-center gap-2">
              <IconAlertCircle className="w-4 h-4 text-rose-400" />
              <h2 className="font-bold text-zinc-100 text-sm tracking-tight">Active Operational Alerts</h2>
            </div>
            <Link to="/alerts" className="text-xs font-mono text-amber-400 hover:text-amber-300 font-semibold">
              ALERTS_DESK &rarr;
            </Link>
          </div>

          <div className="space-y-2">
            {!summary?.activeAlerts || summary.activeAlerts.length === 0 ? (
              <div className="p-6 text-center text-emerald-400 text-xs font-mono flex items-center justify-center gap-2 bg-emerald-950/20 rounded-lg border border-emerald-900/40">
                <IconCheckCircle className="w-4 h-4" />
                <span>ALL WAREHOUSE SIGNALS NOMINAL // NO ACTIVE ALERTS</span>
              </div>
            ) : (
              summary.activeAlerts.slice(0, 5).map((alert: any) => (
                <div
                  key={alert._id}
                  className={`p-3 rounded-lg border flex items-start justify-between gap-3 text-xs ${
                    alert.severity === 'high'
                      ? 'bg-rose-950/30 border-rose-900/50 text-rose-200'
                      : alert.severity === 'medium'
                      ? 'bg-amber-950/30 border-amber-900/50 text-amber-200'
                      : 'bg-[#14171E] border-[#262B35] text-zinc-300'
                  }`}
                >
                  <div>
                    <p className="font-medium text-xs leading-relaxed">{alert.message}</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-[#0A0B0E] border border-[#232730] shrink-0">
                    {alert.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Audit Stream */}
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#232730] pb-3">
            <div className="flex items-center gap-2">
              <IconClipboard className="w-4 h-4 text-zinc-400" />
              <h2 className="font-bold text-zinc-100 text-sm tracking-tight">Live Ledger Audit Stream</h2>
            </div>
            <Link to="/audit" className="text-xs font-mono text-amber-400 hover:text-amber-300 font-semibold">
              AUDIT_TRAIL &rarr;
            </Link>
          </div>

          <div className="space-y-2 divide-y divide-[#1C2028]">
            {!summary?.recentActivity || summary.recentActivity.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs font-mono">No mutations recorded yet.</div>
            ) : (
              summary.recentActivity.map((activity: any) => (
                <div key={activity._id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200 font-mono text-[11px]">
                        {activity.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-amber-400 font-mono text-[9px] px-1 py-0.2 bg-[#171B22] border border-[#262C38] rounded">
                        {activity.entityType}
                      </span>
                    </div>
                    <p className="text-zinc-500 mt-0.5 text-[10px] font-mono">
                      By {activity.userId?.name || 'Automated Daemon'} • {new Date(activity.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="font-mono text-zinc-500 text-[10px] truncate max-w-[100px]">
                    #{activity.entityId?.slice(-6)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Operations Dock */}
      <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-5 text-zinc-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight">Warehouse Operations Center</h3>
            <p className="text-zinc-400 text-xs mt-0.5">Rapid dispatch and inventory controls</p>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">HOTKEYS_ACTIVE</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <Link
            to="/purchase-orders"
            className="p-3 rounded-lg bg-[#12141A] hover:bg-[#161922] transition-all text-center space-y-1.5 border border-[#20242D] hover:border-[#333A48] flex flex-col items-center justify-center group"
          >
            <div className="w-8 h-8 rounded-md bg-[#191D26] border border-[#29303D] text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <IconInbox className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold block text-zinc-300">Create PO</span>
          </Link>
          <Link
            to="/sales-orders"
            className="p-3 rounded-lg bg-[#12141A] hover:bg-[#161922] transition-all text-center space-y-1.5 border border-[#20242D] hover:border-[#333A48] flex flex-col items-center justify-center group"
          >
            <div className="w-8 h-8 rounded-md bg-[#191D26] border border-[#29303D] text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <IconTruck className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold block text-zinc-300">Fulfill SO</span>
          </Link>
          <Link
            to="/inventory"
            className="p-3 rounded-lg bg-[#12141A] hover:bg-[#161922] transition-all text-center space-y-1.5 border border-[#20242D] hover:border-[#333A48] flex flex-col items-center justify-center group"
          >
            <div className="w-8 h-8 rounded-md bg-[#191D26] border border-[#29303D] text-zinc-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <IconPackage className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold block text-zinc-300">Adjust Stock</span>
          </Link>
          <Link
            to="/warehouses"
            className="p-3 rounded-lg bg-[#12141A] hover:bg-[#161922] transition-all text-center space-y-1.5 border border-[#20242D] hover:border-[#333A48] flex flex-col items-center justify-center group"
          >
            <div className="w-8 h-8 rounded-md bg-[#191D26] border border-[#29303D] text-zinc-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <IconBuilding className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold block text-zinc-300">Manage Bins</span>
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
