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
      trend: '+100% synced',
      trendColor: 'text-emerald-400',
    },
    {
      label: 'Stock Valuation',
      value: summary?.totalValuation != null ? `$${Math.round(summary.totalValuation).toLocaleString()}` : '$0',
      subtext: `${summary?.lowStockCount ?? 0} items at reorder point`,
      icon: <IconValuation className="w-5 h-5 text-amber-500" />,
      link: '/inventory',
      tag: 'LEDGER_SUM',
      trend: summary?.lowStockCount > 0 ? `${summary.lowStockCount} low` : 'Optimal',
      trendColor: summary?.lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      label: 'Inbound POs',
      value: summary?.openPOs ?? 0,
      subtext: `${summary?.pendingApprovals ?? 0} pending authorization`,
      icon: <IconInbox className="w-5 h-5 text-emerald-400" />,
      link: '/purchase-orders',
      tag: 'PROCUREMENT',
      trend: summary?.pendingApprovals > 0 ? `${summary.pendingApprovals} review` : 'Clear',
      trendColor: summary?.pendingApprovals > 0 ? 'text-amber-400' : 'text-zinc-400',
    },
    {
      label: 'Outbound SOs',
      value: summary?.openSOs ?? 0,
      subtext: `${summary?.readyToPick ?? 0} to pick • ${summary?.readyToShip ?? 0} to ship`,
      icon: <IconTruck className="w-5 h-5 text-amber-300" />,
      link: '/sales-orders',
      tag: 'DISPATCH',
      trend: `${summary?.readyToPick ?? 0} ready`,
      trendColor: 'text-amber-400',
    },
    {
      label: 'Active Alerts',
      value: summary?.activeAlertsCount ?? 0,
      subtext: 'Operational notices',
      icon: <IconBell className="w-5 h-5 text-rose-400" />,
      link: '/alerts',
      tag: 'TELEMETRY',
      trend: summary?.activeAlertsCount > 0 ? 'Attention' : 'Nominal',
      trendColor: summary?.activeAlertsCount > 0 ? 'text-rose-400' : 'text-emerald-400',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 led-pulse-amber" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight font-sans">
              Operations Command
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#171B22] border border-[#262C38] rounded text-amber-400">
              LIVE_NODE
            </span>
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

      {/* Tactile Quick Action Dock */}
      <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
              Quick Operational Actions
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">PRESS &prop;K FOR COMMAND PALETTE</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-sans">
          <Link
            to="/sales-orders"
            className="p-2.5 rounded-lg bg-[#12151B] hover:bg-[#171B23] border border-[#21252F] hover:border-amber-500/40 text-left transition-all group flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-md bg-[#191D27] border border-[#282F3D] text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <IconTruck className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-xs font-semibold block text-zinc-200 group-hover:text-amber-300">Fulfill Orders</span>
              <span className="text-[10px] text-zinc-500 font-mono">Pick & Ship</span>
            </div>
          </Link>

          <Link
            to="/purchase-orders"
            className="p-2.5 rounded-lg bg-[#12151B] hover:bg-[#171B23] border border-[#21252F] hover:border-emerald-500/40 text-left transition-all group flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-md bg-[#191D27] border border-[#282F3D] text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <IconInbox className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-xs font-semibold block text-zinc-200 group-hover:text-emerald-300">Inbound POs</span>
              <span className="text-[10px] text-zinc-500 font-mono">Receive Goods</span>
            </div>
          </Link>

          <Link
            to="/inventory"
            className="p-2.5 rounded-lg bg-[#12151B] hover:bg-[#171B23] border border-[#21252F] hover:border-amber-500/40 text-left transition-all group flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-md bg-[#191D27] border border-[#282F3D] text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <IconPackage className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-xs font-semibold block text-zinc-200 group-hover:text-amber-300">Adjust Stock</span>
              <span className="text-[10px] text-zinc-500 font-mono">Reconcile Ledger</span>
            </div>
          </Link>

          <Link
            to="/warehouses"
            className="p-2.5 rounded-lg bg-[#12151B] hover:bg-[#171B23] border border-[#21252F] hover:border-sky-500/40 text-left transition-all group flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-md bg-[#191D27] border border-[#282F3D] text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <IconBuilding className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-xs font-semibold block text-zinc-200 group-hover:text-sky-300">Storage Bins</span>
              <span className="text-[10px] text-zinc-500 font-mono">Rack Layouts</span>
            </div>
          </Link>

          <button
            onClick={() => setShowScanner(true)}
            className="p-2.5 rounded-lg bg-[#12151B] hover:bg-[#171B23] border border-[#21252F] hover:border-amber-500/40 text-left transition-all group flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-md bg-[#191D27] border border-[#282F3D] text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <IconScan className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-xs font-semibold block text-zinc-200 group-hover:text-amber-300">Laser Scanner</span>
              <span className="text-[10px] text-zinc-500 font-mono">Instant SKU ID</span>
            </div>
          </button>
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
              <div className="flex items-baseline justify-between">
                <p className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight font-mono">
                  {isLoading ? '...' : kpi.value}
                </p>
                <span className={`text-[10px] font-mono font-bold ${kpi.trendColor}`}>
                  {kpi.trend}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 truncate">{kpi.subtext}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1C2028] flex items-center justify-between text-[9px] font-mono text-zinc-500">
              <span>TAG // {kpi.tag}</span>
              <span className="text-amber-400/80 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Warehouse Capacity & SLA Metrics Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Storage Capacity Gauge */}
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200">Facility Storage Occupancy</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/40">
              OPTIMAL
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>Multi-Zone Bin Density</span>
              <span className="text-zinc-200 font-bold">78.4% Occupied</span>
            </div>
            <div className="w-full h-2 bg-[#171A21] rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: '62%' }} title="Fast moving storage" />
              <div className="bg-amber-500 h-full" style={{ width: '16.4%' }} title="Slow moving reserve" />
              <div className="bg-[#242934] h-full" style={{ width: '21.6%' }} title="Open available bins" />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1">
              <span>ACTIVE BINS: {summary?.totalWarehouses ? summary.totalWarehouses * 16 : 32}</span>
              <span>AVAILABLE BINS: {summary?.totalWarehouses ? summary.totalWarehouses * 4 : 8}</span>
            </div>
          </div>
        </div>

        {/* Fulfillment Velocity */}
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200">Outbound SLA Fulfillment</span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40">
              98.2% ON-TIME
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>Pick-to-Ship Turnaround</span>
              <span className="text-zinc-200 font-bold">&lt; 38 min avg</span>
            </div>
            <div className="w-full h-2 bg-[#171A21] rounded-full overflow-hidden flex">
              <div className="bg-amber-400 h-full" style={{ width: '92%' }} />
              <div className="bg-[#242934] h-full" style={{ width: '8%' }} />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1">
              <span>READY TO PICK: {summary?.readyToPick ?? 0}</span>
              <span>READY TO SHIP: {summary?.readyToShip ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Procurement Pipeline Balance */}
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200">Inbound Receipts Velocity</span>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950/30 px-1.5 py-0.5 rounded border border-sky-900/40">
              ACTIVE_SUPPLY
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>Receipt Reconciliation</span>
              <span className="text-zinc-200 font-bold">100% Variance Checked</span>
            </div>
            <div className="w-full h-2 bg-[#171A21] rounded-full overflow-hidden flex">
              <div className="bg-sky-400 h-full" style={{ width: '85%' }} />
              <div className="bg-[#242934] h-full" style={{ width: '15%' }} />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1">
              <span>OPEN POS: {summary?.openPOs ?? 0}</span>
              <span>PENDING APPROVAL: {summary?.pendingApprovals ?? 0}</span>
            </div>
          </div>
        </div>
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

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
