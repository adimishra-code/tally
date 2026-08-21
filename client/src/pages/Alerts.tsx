import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Alert } from '../types';

export default function Alerts() {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await api.get<Alert[]>('/alerts');
      return data;
    },
    refetchInterval: 30000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => api.post(`/alerts/${alertId}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => api.post(`/alerts/${alertId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const activeAlerts = alerts?.filter((a) => a.status === 'ACTIVE') || [];
  const acknowledgedAlerts = alerts?.filter((a) => a.status === 'ACKNOWLEDGED') || [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-500';
      case 'medium':
        return 'bg-yellow-50 border-yellow-500';
      default:
        return 'bg-blue-50 border-blue-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Alerts</h2>
        <p className="text-gray-600">Automated monitoring and notifications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-red-600">
            {activeAlerts.filter((a) => a.severity === 'high').length}
          </div>
          <div className="text-sm text-red-700 mt-1">High Priority Active</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-yellow-600">
            {activeAlerts.filter((a) => a.severity === 'medium').length}
          </div>
          <div className="text-sm text-yellow-700 mt-1">Medium Priority Active</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-blue-600">{acknowledgedAlerts.length}</div>
          <div className="text-sm text-blue-700 mt-1">Acknowledged</div>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h3>
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert._id}
                className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getTypeIcon(alert.type)}</span>
                      <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-500">{alert.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="font-medium text-gray-900 mb-2">{alert.message}</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Created: {new Date(alert.createdAt).toLocaleString()}</div>
                      {alert.metadata && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {Object.entries(alert.metadata)
                            .filter(([key]) => !key.toLowerCase().includes('id'))
                            .map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-medium">{key}: </span>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => acknowledgeMutation.mutate(alert._id)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => resolveMutation.mutate(alert._id)}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acknowledged Alerts</h3>
          <div className="space-y-3">
            {acknowledgedAlerts.slice(0, 10).map((alert) => (
              <div key={alert._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{getTypeIcon(alert.type)}</span>
                      <span className="text-xs text-gray-500">{alert.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => resolveMutation.mutate(alert._id)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!alerts || alerts.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
          <p className="text-gray-600">No active alerts at the moment</p>
        </div>
      )}
    </div>
  );
}
