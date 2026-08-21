import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function AuditLog() {
  const [entityType, setEntityType] = useState('');
  const [limit, setLimit] = useState(50);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType) params.append('entityType', entityType);
      params.append('limit', limit.toString());
      const { data } = await api.get(`/audit?${params}`);
      return data;
    },
  });

  const getActionColor = (action: string) => {
    if (action.includes('CREATED')) return 'text-green-600';
    if (action.includes('DELETED') || action.includes('CANCELLED')) return 'text-red-600';
    if (action.includes('APPROVED')) return 'text-blue-600';
    return 'text-gray-600';
  };

  const formatDiff = (before: any, after: any) => {
    if (!before || !after) return null;
    const changes = Object.keys(after).filter((key) => before[key] !== after[key]);
    return changes.map((key) => (
      <div key={key} className="text-xs">
        <span className="font-medium">{key}:</span> {JSON.stringify(before[key])} → {JSON.stringify(after[key])}
      </div>
    ));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Audit Log</h2>
        <p className="text-gray-600">Track all system changes and user actions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Types</option>
              <option value="PurchaseOrder">Purchase Orders</option>
              <option value="SalesOrder">Sales Orders</option>
              <option value="Product">Products</option>
              <option value="User">Users</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value={25}>Last 25</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
              <option value={200}>Last 200</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading audit logs...</div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No audit logs found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log: any) => (
              <div key={log._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{log.entityType}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      By: <span className="font-medium">{log.userId?.name || 'Unknown'}</span> (
                      {log.userId?.email || 'N/A'})
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Changes */}
                {log.before && log.after && (
                  <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-1">Changes:</div>
                    {formatDiff(log.before, log.after)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
