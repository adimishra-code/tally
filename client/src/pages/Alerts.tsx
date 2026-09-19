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
      toast.success('Alert acknowledged');
    },
    onError: () => toast.error('Failed to acknowledge alert'),
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => api.post(`/alerts/${alertId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Alert resolved');
    },
    onError: () => toast.error('Failed to resolve alert'),
  });

  const acknowledgeAllMutation = useMutation({
    mutationFn: () => api.post('/alerts/acknowledge-all'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success(res.data.message || 'All active alerts acknowledged');
    },
    onError: () => toast.error('Failed to acknowledge alerts'),
  });

  const resolveAllMutation = useMutation({
    mutationFn: () => api.post('/alerts/resolve-all'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success(res.data.message || 'All alerts resolved');
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
      a.download = `alerts-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Alerts exported to CSV');
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-l-4 border-l-rose-500 border-rose-500/30 bg-rose-500/5';
      case 'medium':
        return 'border-l-4 border-l-amber-500 border-amber-500/30 bg-amber-500/5';
      default:
        return 'border-l-4 border-l-cyan-500 border-cyan-500/30 bg-cyan-500/5';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return <IconPackage className="w-4 h-4 text-amber-400" />;
      case 'EXPIRY_WARNING':
        return (
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'SLA_BREACH':
        return <IconAlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <IconAlertTriangle className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Alerts Desk</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Automated BullMQ background health monitors, stock thresholds, and SLA breaches</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={exportAlertsCSV}
            className="px-3.5 py-2 bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <IconExport className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </button>
          {activeAlerts.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`Acknowledge all ${activeAlerts.length} active alert(s)?`)) {
                  acknowledgeAllMutation.mutate();
                }
              }}
              disabled={acknowledgeAllMutation.isPending}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
            >
              {acknowledgeAllMutation.isPending ? 'Acknowledging...' : `Acknowledge All (${activeAlerts.length})`}
            </button>
          )}
          {(activeAlerts.length > 0 || acknowledgedAlerts.length > 0) && (
            <button
              onClick={() => {
                if (confirm('Resolve all active and acknowledged alerts?')) {
                  resolveAllMutation.mutate();
                }
              }}
              disabled={resolveAllMutation.isPending}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {resolveAllMutation.isPending ? 'Resolving...' : 'Resolve All'}
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">High Severity</p>
              <p className="text-3xl font-extrabold font-mono text-rose-300 mt-1">
                {activeAlerts.filter((a) => a.severity === 'high').length}
              </p>
              <p className="text-xs text-rose-400/80 mt-1">Requires urgent action</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <IconAlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Medium / Warning</p>
              <p className="text-3xl font-extrabold font-mono text-amber-300 mt-1">
                {activeAlerts.filter((a) => a.severity === 'medium').length}
              </p>
              <p className="text-xs text-amber-400/80 mt-1">Approaching thresholds</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <IconAlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Acknowledged</p>
              <p className="text-3xl font-extrabold font-mono text-cyan-300 mt-1">{acknowledgedAlerts.length}</p>
              <p className="text-xs text-cyan-400/80 mt-1">Under investigation</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <IconClipboard className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-2.5 text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search alerts by message, SKU, product, or warehouse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-xs sm:text-sm text-white placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: 'All Types', key: 'ALL' },
              { label: 'Low Stock', key: 'LOW_STOCK' },
              { label: 'Expiry Warning', key: 'EXPIRY_WARNING' },
              { label: 'SLA Breach', key: 'SLA_BREACH' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedType(tab.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedType === tab.key
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl outline-none text-slate-200 focus:border-cyan-500"
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
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Active Alerts ({filteredActive.length})
        </h3>

        {isLoading ? (
          <div className="bg-slate-900/60 rounded-2xl p-12 text-center text-slate-500 border border-slate-800/80">
            Loading alerts...
          </div>
        ) : filteredActive.length === 0 ? (
          <div className="bg-slate-900/60 rounded-2xl p-12 text-center text-slate-400 border border-slate-800/80">
            <span className="text-4xl block mb-2">✅</span>
            <h4 className="text-base font-bold text-white">No active alerts</h4>
            <p className="text-xs text-slate-500 mt-1">All monitored metrics are within normal parameters.</p>
          </div>
        ) : (
          filteredActive.map((alert) => (
            <div
              key={alert._id}
              className={`p-5 rounded-2xl shadow-lg bg-slate-900/80 border transition-all ${getSeverityColor(
                alert.severity
              )}`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl">{getTypeIcon(alert.type)}</span>
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md border uppercase font-mono ${getSeverityBadge(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-semibold text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                      {alert.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      • {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="font-semibold text-white text-sm">{alert.message}</p>

                  {/* Metadata pills */}
                  {alert.metadata && (
                    <div className="flex gap-2 flex-wrap text-xs pt-1">
                      {alert.metadata.warehouseName && (
                        <span className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
                          Warehouse: <strong className="text-white">{alert.metadata.warehouseName}</strong>
                        </span>
                      )}
                      {alert.metadata.currentBalance !== undefined && (
                        <span className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
                          Balance: <strong className="text-cyan-400 font-mono">{alert.metadata.currentBalance}</strong> (Min: {alert.metadata.reorderPoint})
                        </span>
                      )}
                      {alert.metadata.orderNumber && (
                        <span className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
                          Order: <strong className="text-cyan-400 font-mono">{alert.metadata.orderNumber}</strong>
                        </span>
                      )}
                      {alert.metadata.daysUntilExpiry !== undefined && (
                        <span className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
                          Expires in: <strong className="text-amber-400 font-mono">{alert.metadata.daysUntilExpiry} days</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {alert.type === 'LOW_STOCK' && (
                    <Link
                      to="/purchase-orders"
                      className="px-3 py-1.5 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold rounded-lg hover:bg-cyan-500/20 transition-colors"
                    >
                      + Order Stock
                    </Link>
                  )}
                  {alert.type === 'SLA_BREACH' && (
                    <Link
                      to="/sales-orders"
                      className="px-3 py-1.5 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold rounded-lg hover:bg-purple-500/20 transition-colors"
                    >
                      Fulfill Order
                    </Link>
                  )}
                  {alert.type === 'EXPIRY_WARNING' && (
                    <Link
                      to="/inventory"
                      className="px-3 py-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold rounded-lg hover:bg-amber-500/20 transition-colors"
                    >
                      Adjust Stock
                    </Link>
                  )}

                  <button
                    onClick={() => acknowledgeMutation.mutate(alert._id)}
                    disabled={acknowledgeMutation.isPending}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => resolveMutation.mutate(alert._id)}
                    disabled={resolveMutation.isPending}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-emerald-500/20"
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
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800/80 p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Acknowledged Alerts ({acknowledgedAlerts.length})
          </h3>
          <div className="divide-y divide-slate-800/60">
            {acknowledgedAlerts.map((alert) => (
              <div key={alert._id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span>{getTypeIcon(alert.type)}</span>
                    <span className="font-semibold text-slate-200">{alert.message}</span>
                  </div>
                  <p className="text-slate-500 font-mono">
                    Logged: {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => resolveMutation.mutate(alert._id)}
                  className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-emerald-500/20"
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
