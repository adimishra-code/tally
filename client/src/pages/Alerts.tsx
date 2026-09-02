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

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await api.get<Alert[]>('/alerts');
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

  const allAlerts = alerts || [];
  const activeAlerts = allAlerts.filter((a) => a.status === 'ACTIVE');
  const acknowledgedAlerts = allAlerts.filter((a) => a.status === 'ACKNOWLEDGED');

  const filteredActive = activeAlerts.filter((a) => {
    if (selectedType !== 'ALL' && a.type !== selectedType) return false;
    if (selectedSeverity !== 'ALL' && a.severity !== selectedSeverity) return false;
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

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { label: 'All Types', key: 'ALL' },
            { label: '⚠️ Low Stock', key: 'LOW_STOCK' },
            { label: '⏰ Expiry Warning', key: 'EXPIRY_WARNING' },
            { label: '🚨 SLA Breach', key: 'SLA_BREACH' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedType(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedType === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Severity:</label>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="high">High only</option>
            <option value="medium">Medium only</option>
            <option value="low">Low only</option>
          </select>
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
