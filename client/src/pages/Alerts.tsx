import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Alert } from '../types';
import { IconExport, IconAlertCircle, IconAlertTriangle, IconClipboard, IconPackage } from '../components/Icons';

export default function Alerts() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', selectedType, selectedSeverity, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (selectedSeverity !== 'ALL') params.append('severity', selectedSeverity);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      const { data } = await api.get<Alert[]>(`/alerts?${params.toString()}`);
      return data;
    },
    refetchInterval: 15000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => api.post(`/alerts/${alertId}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Alert acknowledged and marked in-triage');
    },
    onError: () => toast.error('Failed to acknowledge alert'),
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => api.post(`/alerts/${alertId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Alert resolved and archived');
    },
    onError: () => toast.error('Failed to resolve alert'),
  });

  const acknowledgeAllMutation = useMutation({
    mutationFn: () => api.post('/alerts/acknowledge-all'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success(res.data.message || 'All active exceptions acknowledged');
    },
    onError: () => toast.error('Failed to acknowledge alerts'),
  });

  const resolveAllMutation = useMutation({
    mutationFn: () => api.post('/alerts/resolve-all'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success(res.data.message || 'All active exceptions resolved');
    },
    onError: () => toast.error('Failed to resolve alerts'),
  });

  const exportAlertsCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (selectedSeverity !== 'ALL') params.append('severity', selectedSeverity);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await api.get(`/alerts/export/csv?${params.toString()}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alerts_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Alert exception log exported');
    } catch {
      toast.error('Failed to export alerts');
    }
  };

  const allAlerts = alerts || [];
  const activeAlerts = allAlerts.filter((a) => a.status === 'ACTIVE');
  const acknowledgedAlerts = allAlerts.filter((a) => a.status === 'ACKNOWLEDGED');

  const filteredActive = activeAlerts.filter((a) => {
    if (selectedType !== 'ALL' && a.type !== selectedType) return false;
    if (selectedSeverity !== 'ALL' && a.severity !== selectedSeverity) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchMsg = a.message?.toLowerCase().includes(q);
      const matchWh = (a.metadata?.warehouseName as string)?.toLowerCase().includes(q);
      const matchSku = (a.metadata?.productSku as string)?.toLowerCase().includes(q);
      const matchProd = (a.metadata?.productName as string)?.toLowerCase().includes(q);
      if (!matchMsg && !matchWh && !matchSku && !matchProd) return false;
    }
    return true;
  });

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-l-2 border-l-rose-500 bg-[#0E1014] border-[#232730]';
      case 'medium':
        return 'border-l-2 border-l-amber-500 bg-[#0E1014] border-[#232730]';
      default:
        return 'border-l-2 border-l-zinc-500 bg-[#0E1014] border-[#232730]';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return <IconPackage className="w-3.5 h-3.5 text-amber-400" />;
      case 'EXPIRY_WARNING':
        return (
          <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'SLA_BREACH':
        return <IconAlertCircle className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <IconAlertTriangle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500/90 font-semibold">Incident Telemetry // Exception Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">Operational Alerts & SLA Watch</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">Automated BullMQ background health monitors, inventory breach detectors, and fulfillment delays</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportAlertsCSV}
            className="px-3 py-1.5 bg-[#0E1014] border border-[#232730] hover:border-zinc-600 text-zinc-300 hover:text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
          >
            <IconExport className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export CSV</span>
          </button>
          {activeAlerts.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`Acknowledge all ${activeAlerts.length} active exceptions?`)) {
                  acknowledgeAllMutation.mutate();
                }
              }}
              disabled={acknowledgeAllMutation.isPending}
              className="px-3 py-1.5 bg-[#181B22] hover:bg-zinc-800 text-zinc-200 text-xs font-mono font-medium rounded-lg border border-[#282D37] transition-colors disabled:opacity-50"
            >
              {acknowledgeAllMutation.isPending ? 'Acknowledging...' : `Acknowledge All (${activeAlerts.length})`}
            </button>
          )}
          {(activeAlerts.length > 0 || acknowledgedAlerts.length > 0) && (
            <button
              onClick={() => {
                if (confirm('Resolve all active and acknowledged exceptions?')) {
                  resolveAllMutation.mutate();
                }
              }}
              disabled={resolveAllMutation.isPending}
              className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {resolveAllMutation.isPending ? 'Resolving...' : 'Resolve All'}
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">Critical SLA / Breaches</p>
              <p className="text-2xl font-bold font-mono text-rose-400 mt-1">
                {activeAlerts.filter((a) => a.severity === 'high').length}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">High severity, immediate dispatch required</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <IconAlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Warning / Reorder Thresholds</p>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {activeAlerts.filter((a) => a.severity === 'medium').length}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Approaching safety stock minimums</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <IconAlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Triaged / In Progress</p>
              <p className="text-2xl font-bold font-mono text-zinc-300 mt-1">{acknowledgedAlerts.length}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Acknowledged, awaiting physical resolution</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center justify-center">
              <IconClipboard className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-mono">EXC://</span>
          <input
            type="text"
            placeholder="Search exceptions by message, SKU code, or facility..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-4 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-xs font-mono text-white placeholder-zinc-600 outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { label: 'All Types', key: 'ALL' },
              { label: 'Low Stock', key: 'LOW_STOCK' },
              { label: 'Expiry Warning', key: 'EXPIRY_WARNING' },
              { label: 'SLA Breach', key: 'SLA_BREACH' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedType(tab.key)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  selectedType === tab.key
                    ? 'bg-amber-500 text-black font-semibold'
                    : 'bg-[#090A0C] border border-[#232730] text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="shrink-0">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-300 outline-none focus:border-amber-500/50"
            >
              <option value="ALL">All Severities</option>
              <option value="high">High only</option>
              <option value="medium">Medium only</option>
              <option value="low">Low only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            Active Incident Stream ({filteredActive.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="bg-[#0E1014] rounded-xl p-12 text-center text-zinc-500 border border-[#232730] font-mono text-xs">
            Polling exception queue...
          </div>
        ) : filteredActive.length === 0 ? (
          <div className="bg-[#0E1014] rounded-xl p-12 text-center text-zinc-400 border border-[#232730]">
            <span className="text-2xl block mb-1">🛡️</span>
            <h4 className="text-sm font-bold text-white font-mono">No Active Exceptions Detected</h4>
            <p className="text-xs text-zinc-500 mt-0.5">All monitored warehouse thresholds, stock levels, and order SLAs are within bounds.</p>
          </div>
        ) : (
          filteredActive.map((alert) => (
            <div
              key={alert._id}
              className={`p-4 rounded-xl shadow-lg transition-all ${getSeverityBorder(alert.severity)}`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">{getTypeIcon(alert.type)}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${getSeverityBadge(alert.severity)}`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400 bg-[#090A0C] px-2 py-0.5 rounded border border-[#232730]">
                      {alert.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      • {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="font-medium text-white text-xs sm:text-sm">{alert.message}</p>

                  {/* Metadata pills */}
                  {alert.metadata && (
                    <div className="flex gap-2 flex-wrap text-xs pt-1 font-mono">
                      {alert.metadata.warehouseName && (
                        <span className="bg-[#090A0C] border border-[#232730] px-2 py-0.5 rounded text-zinc-400 text-[11px]">
                          Site: <strong className="text-white">{alert.metadata.warehouseName}</strong>
                        </span>
                      )}
                      {alert.metadata.currentBalance !== undefined && (
                        <span className="bg-[#090A0C] border border-[#232730] px-2 py-0.5 rounded text-zinc-400 text-[11px]">
                          Balance: <strong className="text-amber-400">{alert.metadata.currentBalance}</strong> (Min: {alert.metadata.reorderPoint})
                        </span>
                      )}
                      {alert.metadata.orderNumber && (
                        <span className="bg-[#090A0C] border border-[#232730] px-2 py-0.5 rounded text-zinc-400 text-[11px]">
                          Order Ref: <strong className="text-amber-400">{alert.metadata.orderNumber}</strong>
                        </span>
                      )}
                      {alert.metadata.daysUntilExpiry !== undefined && (
                        <span className="bg-[#090A0C] border border-[#232730] px-2 py-0.5 rounded text-zinc-400 text-[11px]">
                          Expiry: <strong className="text-amber-400">{alert.metadata.daysUntilExpiry} days</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 pt-1 md:pt-0">
                  {alert.type === 'LOW_STOCK' && (
                    <Link
                      to="/purchase-orders"
                      className="px-2.5 py-1 text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded hover:bg-amber-500/20 transition-colors"
                    >
                      + Order Stock
                    </Link>
                  )}
                  {alert.type === 'SLA_BREACH' && (
                    <Link
                      to="/sales-orders"
                      className="px-2.5 py-1 text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded hover:bg-rose-500/20 transition-colors"
                    >
                      Fulfill Order
                    </Link>
                  )}
                  {alert.type === 'EXPIRY_WARNING' && (
                    <Link
                      to="/inventory"
                      className="px-2.5 py-1 text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded hover:bg-amber-500/20 transition-colors"
                    >
                      Adjust Stock
                    </Link>
                  )}

                  <button
                    onClick={() => acknowledgeMutation.mutate(alert._id)}
                    disabled={acknowledgeMutation.isPending}
                    className="px-2.5 py-1 bg-[#181B22] hover:bg-zinc-800 text-zinc-300 text-xs font-mono rounded border border-[#282D37] transition-colors"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => resolveMutation.mutate(alert._id)}
                    disabled={resolveMutation.isPending}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono rounded transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Acknowledged Alerts Section */}
      {acknowledgedAlerts.length > 0 && (
        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Triaged In-Progress Exceptions ({acknowledgedAlerts.length})
            </h3>
          </div>
          <div className="divide-y divide-[#1A1E26]">
            {acknowledgedAlerts.map((alert) => (
              <div key={alert._id} className="py-3 flex items-center justify-between gap-4 text-xs font-mono">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span>{getTypeIcon(alert.type)}</span>
                    <span className="font-medium text-zinc-200">{alert.message}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Logged: {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => resolveMutation.mutate(alert._id)}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono rounded transition-colors"
                >
                  Mark Resolved
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
