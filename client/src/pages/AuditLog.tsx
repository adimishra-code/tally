import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function AuditLog() {
  const [entityType, setEntityType] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [inspectLog, setInspectLog] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, actionFilter, startDate, endDate, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType) params.append('entityType', entityType);
      if (actionFilter) params.append('action', actionFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      const res = await api.get(`/audit?${params.toString()}`);
      return res.data;
    },
  });

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (entityType) params.append('entityType', entityType);
      if (actionFilter) params.append('action', actionFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/audit/export/csv?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit log export downloaded');
    } catch {
      toast.error('Failed to export audit logs');
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CREATED') || action.includes('TRANSFER_IN')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (action.includes('DELETED') || action.includes('CANCELLED') || action.includes('TRANSFER_OUT')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (action.includes('APPROVED') || action.includes('SHIPPED')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (action.includes('ADJUSTED') || action.includes('PICKED')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">System Audit Trail</h2>
          <p className="text-gray-600">Tamper-evident logs of entity mutations, status changes, and staff operations</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <span>📥</span> Export Audit CSV
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Entity Domain</label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Entities</option>
              <option value="PurchaseOrder">Purchase Orders</option>
              <option value="SalesOrder">Sales Orders</option>
              <option value="Product">Products</option>
              <option value="Warehouse">Warehouses</option>
              <option value="Organization">Organization Settings</option>
              <option value="User">Users & Permissions</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Actions</option>
              <option value="PO_CREATED">PO Created</option>
              <option value="PO_TRANSITION">PO Status Transition</option>
              <option value="SO_CREATED">SO Created</option>
              <option value="SO_TRANSITION">SO Status Transition</option>
              <option value="STOCK_ADJUSTED">Stock Adjusted</option>
              <option value="STOCK_TRANSFERRED">Stock Transferred</option>
              <option value="ORG_SETTINGS_UPDATED">Settings Updated</option>
              <option value="USER_UPDATED">User Updated</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
          <span>Found <strong>{total}</strong> audit event(s) matching criteria</span>
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-xs outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading audit records...</div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No audit records found matching your filters.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log: any) => (
              <div key={log._id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded border uppercase ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {log.entityType}
                      </span>
                      <span className="text-xs font-mono text-gray-400">ID: {log.entityId}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Actor: <strong className="text-gray-900">{log.userId?.name || 'System Auto-Job'}</strong>{' '}
                      {log.userId?.email && <span className="text-gray-400">({log.userId.email})</span>}
                      {log.userId?.role && (
                        <span className="ml-1.5 px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded text-[10px] uppercase font-bold">
                          {log.userId.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <span className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={() => setInspectLog(log)}
                      className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium rounded transition-colors"
                    >
                      Inspect Diff
                    </button>
                  </div>
                </div>

                {/* Inline Diff Preview */}
                {(log.before || log.after) && (
                  <div className="mt-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-mono text-gray-700 space-y-1">
                    {Object.keys(log.after || {}).map((key) => {
                      const beforeVal = log.before?.[key];
                      const afterVal = log.after?.[key];
                      if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) return null;
                      return (
                        <div key={key} className="truncate">
                          <span className="font-semibold text-gray-900">{key}:</span>{' '}
                          {beforeVal !== undefined && (
                            <span className="text-red-600 line-through mr-1">
                              {typeof beforeVal === 'object' ? JSON.stringify(beforeVal) : String(beforeVal)}
                            </span>
                          )}
                          <span className="text-green-700 font-bold">
                            {typeof afterVal === 'object' ? JSON.stringify(afterVal) : String(afterVal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-sm">
            <span className="text-xs text-gray-600">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} records)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Changes Modal */}
      {inspectLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Audit Snapshot: <span className="font-mono text-blue-600">{inspectLog.action}</span>
                </h3>
                <p className="text-xs text-gray-500">
                  {inspectLog.entityType} ({inspectLog.entityId}) • {new Date(inspectLog.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto flex-1">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">State Before</h4>
                <pre className="text-xs font-mono bg-red-50/50 p-3 rounded-xl border border-red-200 overflow-x-auto text-red-900 max-h-72">
                  {JSON.stringify(inspectLog.before || {}, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">State After</h4>
                <pre className="text-xs font-mono bg-green-50/50 p-3 rounded-xl border border-green-200 overflow-x-auto text-green-900 max-h-72">
                  {JSON.stringify(inspectLog.after || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 text-right">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
