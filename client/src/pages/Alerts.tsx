import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Alert } from '../types';

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
        return 'bg-red-50/80 border-red-500';
      case 'medium':
        return 'bg-amber-50/80 border-amber-500';
      default:
        return 'bg-blue-50/80 border-blue-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return '⚠️';
      case 'EXPIRY_WARNING':
        return '⏰';
      case 'SLA_BREACH':
        return '🚨';
      default:
        return '📢';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Alerts Desk</h2>
          <p className="text-gray-600">Automated BullMQ background health monitors, stock thresholds, and SLA breaches</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={exportAlertsCSV}
            className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>📥</span> Export CSV
          </button>
          {activeAlerts.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`Acknowledge all ${activeAlerts.length} active alert(s)?`)) {
                  acknowledgeAllMutation.mutate();
                }
              }}
              disabled={acknowledgeAllMutation.isPending}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
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
              className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {resolveAllMutation.isPending ? 'Resolving...' : 'Resolve All'}
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50/80 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">High Severity</p>
              <p className="text-3xl font-extrabold text-red-700 mt-1">
                {activeAlerts.filter((a) => a.severity === 'high').length}
              </p>
              <p className="text-xs text-red-600/80 mt-1">Requires urgent action</p>
            </div>
            <span className="text-3xl">🚨</span>
          </div>
        </div>

        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Medium / Warning</p>
              <p className="text-3xl font-extrabold text-amber-800 mt-1">
                {activeAlerts.filter((a) => a.severity === 'medium').length}
              </p>
              <p className="text-xs text-amber-700/80 mt-1">Approaching thresholds</p>
            </div>
            <span className="text-3xl">⚠️</span>
          </div>
        </div>

        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Acknowledged</p>
              <p className="text-3xl font-extrabold text-blue-800 mt-1">{acknowledgedAlerts.length}</p>
              <p className="text-xs text-blue-700/80 mt-1">Under investigation</p>
            </div>
            <span className="text-3xl">📋</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search alerts by message, SKU, product, or warehouse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { label: 'All Types', key: 'ALL' },
              { label: '⚠️ Low Stock', key: 'LOW_STOCK' },
              { label: '⏰ Expiry', key: 'EXPIRY_WARNING' },
              { label: '🚨 SLA', key: 'SLA_BREACH' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedType(tab.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedType === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white text-gray-700"
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
        <h3 className="text-base font-bold text-gray-900">
          Active Alerts ({filteredActive.length})
        </h3>

        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border border-gray-200">
            Loading alerts...
          </div>
        ) : filteredActive.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border border-gray-200">
            <span className="text-4xl block mb-2">✅</span>
            <h4 className="text-base font-bold text-gray-900">No active alerts</h4>
            <p className="text-xs text-gray-500 mt-1">All monitored metrics are within normal parameters.</p>
          </div>
        ) : (
          filteredActive.map((alert) => (
            <div
              key={alert._id}
              className={`p-5 rounded-2xl border-l-4 shadow-sm bg-white border border-gray-200 transition-all ${getSeverityColor(
                alert.severity
              )}`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xl">{getTypeIcon(alert.type)}</span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-md border uppercase ${getSeverityBadge(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {alert.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      • {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="font-semibold text-gray-900 text-sm">{alert.message}</p>

                  {/* Metadata pills */}
                  {alert.metadata && (
                    <div className="flex gap-2 flex-wrap text-xs pt-1">
                      {alert.metadata.warehouseName && (
                        <span className="bg-gray-100 px-2.5 py-1 rounded-md text-gray-700">
                          Warehouse: <strong>{alert.metadata.warehouseName}</strong>
                        </span>
                      )}
                      {alert.metadata.currentBalance !== undefined && (
                        <span className="bg-gray-100 px-2.5 py-1 rounded-md text-gray-700">
                          Balance: <strong>{alert.metadata.currentBalance}</strong> (Min: {alert.metadata.reorderPoint})
                        </span>
                      )}
                      {alert.metadata.orderNumber && (
                        <span className="bg-gray-100 px-2.5 py-1 rounded-md text-gray-700">
                          Order: <strong>{alert.metadata.orderNumber}</strong>
                        </span>
                      )}
                      {alert.metadata.daysUntilExpiry !== undefined && (
                        <span className="bg-gray-100 px-2.5 py-1 rounded-md text-gray-700">
                          Expires in: <strong>{alert.metadata.daysUntilExpiry} days</strong>
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
                      className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      + Order Stock
                    </Link>
                  )}
                  {alert.type === 'SLA_BREACH' && (
                    <Link
                      to="/sales-orders"
                      className="px-3 py-1.5 text-xs bg-purple-50 text-purple-700 font-semibold rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      Fulfill Order
                    </Link>
                  )}
                  {alert.type === 'EXPIRY_WARNING' && (
                    <Link
                      to="/inventory"
                      className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 font-semibold rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      Adjust Stock
                    </Link>
                  )}

                  <button
                    onClick={() => acknowledgeMutation.mutate(alert._id)}
                    disabled={acknowledgeMutation.isPending}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => resolveMutation.mutate(alert._id)}
                    disabled={resolveMutation.isPending}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-3">
          <h3 className="text-base font-bold text-gray-900">
            Acknowledged Alerts ({acknowledgedAlerts.length})
          </h3>
          <div className="divide-y divide-gray-100">
            {acknowledgedAlerts.map((alert) => (
              <div key={alert._id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span>{getTypeIcon(alert.type)}</span>
                    <span className="font-semibold text-gray-800">{alert.message}</span>
                  </div>
                  <p className="text-gray-400">
                    Logged: {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => resolveMutation.mutate(alert._id)}
                  className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
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
