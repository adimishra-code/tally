import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { IconExport } from '../components/Icons';

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
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (action.includes('DELETED') || action.includes('CANCELLED') || action.includes('TRANSFER_OUT')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (action.includes('APPROVED') || action.includes('SHIPPED')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
    if (action.includes('ADJUSTED') || action.includes('PICKED')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">System Audit Trail</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Tamper-evident immutable logs of entity mutations, status changes, and staff operations</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm text-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <IconExport className="w-4 h-4 text-slate-400" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Entity Domain</label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-slate-200"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-slate-200"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <span>Found <strong className="text-white font-mono">{total}</strong> audit event(s) matching criteria</span>
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs outline-none text-slate-200"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading audit records...</div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No audit records found matching your filters.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {logs.map((log: any) => (
              <div key={log._id} className="p-4 sm:p-5 hover:bg-slate-800/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border uppercase font-mono ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                        {log.entityType}
                      </span>
                      <span className="text-xs font-mono text-slate-500">ID: {log.entityId}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Actor: <strong className="text-white">{log.userId?.name || 'System Auto-Job'}</strong>{' '}
                      {log.userId?.email && <span className="text-slate-500 font-mono">({log.userId.email})</span>}
                      {log.userId?.role && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] uppercase font-bold border border-slate-700">
                          {log.userId.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={() => setInspectLog(log)}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-semibold rounded-lg border border-slate-700 transition-colors"
                    >
                      Inspect Diff
                    </button>
                  </div>
                </div>

                {/* Inline Diff Preview */}
                {(log.before || log.after) && (
                  <div className="mt-2 text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 font-mono text-slate-300 space-y-1">
                    {Object.keys(log.after || {}).map((key) => {
                      const beforeVal = log.before?.[key];
                      const afterVal = log.after?.[key];
                      if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) return null;
                      return (
                        <div key={key} className="truncate">
                          <span className="font-semibold text-slate-400">{key}:</span>{' '}
                          {beforeVal !== undefined && (
                            <span className="text-rose-400 line-through mr-1">
                              {typeof beforeVal === 'object' ? JSON.stringify(beforeVal) : String(beforeVal)}
                            </span>
                          )}
                          <span className="text-emerald-400 font-bold">
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
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-sm">
            <span className="text-xs text-slate-400">
              Page <strong className="text-white font-mono">{page}</strong> of <strong className="text-white font-mono">{totalPages}</strong> ({total} records)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Changes Modal */}
      {inspectLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Audit Snapshot: <span className="font-mono text-cyan-400">{inspectLog.action}</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {inspectLog.entityType} ({inspectLog.entityId}) • {new Date(inspectLog.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto flex-1">
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">State Before</h4>
                <pre className="text-xs font-mono bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 overflow-x-auto text-rose-300 max-h-72">
                  {JSON.stringify(inspectLog.before || {}, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">State After</h4>
                <pre className="text-xs font-mono bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 overflow-x-auto text-emerald-300 max-h-72">
                  {JSON.stringify(inspectLog.after || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-right">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors text-xs"
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
