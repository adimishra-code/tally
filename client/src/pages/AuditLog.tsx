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
      link.setAttribute('download', `tally_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
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
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (action.includes('ADJUSTED') || action.includes('PICKED')) {
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500/90 font-semibold">Ledger Stream // Immutable Records</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">System Audit Trail</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">Tamper-evident logs of entity mutations, status lifecycle events, and warehouse staff transactions</p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3.5 py-2 bg-[#0E1014] border border-[#232730] hover:border-zinc-600 text-zinc-300 hover:text-white font-medium rounded-lg transition-colors text-xs font-mono flex items-center gap-1.5 self-start md:self-auto"
        >
          <IconExport className="w-3.5 h-3.5 text-zinc-400" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Entity Domain</label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs font-mono bg-[#090A0C] border border-[#232730] rounded-lg focus:border-amber-500/50 outline-none text-zinc-200"
            >
              <option value="">All Domains</option>
              <option value="PurchaseOrder">Purchase Orders</option>
              <option value="SalesOrder">Sales Orders</option>
              <option value="Product">Products</option>
              <option value="Warehouse">Warehouses</option>
              <option value="Organization">Organization Settings</option>
              <option value="User">Users & Permissions</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs font-mono bg-[#090A0C] border border-[#232730] rounded-lg focus:border-amber-500/50 outline-none text-zinc-200"
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
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">From Timestamp</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs font-mono bg-[#090A0C] border border-[#232730] rounded-lg focus:border-amber-500/50 outline-none text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">To Timestamp</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs font-mono bg-[#090A0C] border border-[#232730] rounded-lg focus:border-amber-500/50 outline-none text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#1F232B] text-xs font-mono text-zinc-500">
          <span>Found <strong className="text-zinc-200 font-bold">{total}</strong> immutable event record(s)</span>
          <div className="flex items-center gap-2">
            <span>Rows:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-2 py-0.5 bg-[#090A0C] border border-[#232730] rounded text-xs outline-none text-zinc-300 font-mono"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="bg-[#0E1014] border border-[#232730] rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">Accessing ledger storage nodes...</div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 font-mono text-xs">No audit events match your filter parameters.</div>
        ) : (
          <div className="divide-y divide-[#1A1E26]">
            {logs.map((log: any) => (
              <div key={log._id} className="p-4 hover:bg-[#12141A] transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-1.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap font-mono">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-semibold text-zinc-300 bg-[#090A0C] px-2 py-0.5 rounded border border-[#232730]">
                        {log.entityType}
                      </span>
                      <span className="text-xs text-zinc-500">ID: {log.entityId}</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Actor: <strong className="text-white">{log.userId?.name || 'System Worker'}</strong>{' '}
                      {log.userId?.email && <span className="text-zinc-500 font-mono">({log.userId.email})</span>}
                      {log.userId?.role && (
                        <span className="ml-1.5 px-1.5 py-0.2 bg-[#181B22] text-zinc-300 rounded text-[10px] uppercase font-mono font-bold border border-[#282D37]">
                          {log.userId.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={() => setInspectLog(log)}
                      className="px-2 py-0.5 text-xs bg-[#181B22] hover:bg-zinc-800 text-amber-400 hover:text-amber-300 font-mono font-medium rounded border border-[#282D37] transition-colors"
                    >
                      [INSPECT DIFF]
                    </button>
                  </div>
                </div>

                {/* Inline Diff Preview */}
                {(log.before || log.after) && (
                  <div className="mt-2 text-xs bg-[#090A0C] p-2 rounded-lg border border-[#232730] font-mono text-zinc-300 space-y-0.5">
                    {Object.keys(log.after || {}).map((key) => {
                      const beforeVal = log.before?.[key];
                      const afterVal = log.after?.[key];
                      if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) return null;
                      return (
                        <div key={key} className="truncate">
                          <span className="text-zinc-500 font-semibold">{key}:</span>{' '}
                          {beforeVal !== undefined && (
                            <span className="text-rose-400 line-through mr-1">
                              {typeof beforeVal === 'object' ? JSON.stringify(beforeVal) : String(beforeVal)}
                            </span>
                          )}
                          <span className="text-emerald-400 font-semibold">
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
          <div className="p-3 border-t border-[#232730] bg-[#090A0C] flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">
              Page <strong className="text-zinc-200">{page}</strong> of <strong className="text-zinc-200">{totalPages}</strong> ({total} events)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-[#181B22] border border-[#232730] rounded text-zinc-300 hover:text-white disabled:opacity-30 transition-colors"
              >
                &larr; Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-[#181B22] border border-[#232730] rounded text-zinc-300 hover:text-white disabled:opacity-30 transition-colors"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Changes Modal */}
      {inspectLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1014] border border-[#232730] rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[85vh] flex flex-col text-white">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-500">Ledger Verification</span>
                <h3 className="text-base font-bold text-white font-mono">{inspectLog.action}</h3>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {inspectLog.entityType} ({inspectLog.entityId}) • {new Date(inspectLog.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="text-zinc-500 hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto flex-1">
              <div>
                <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">State Before Mutation</h4>
                <pre className="text-xs font-mono bg-[#090A0C] p-3 rounded-lg border border-rose-500/20 overflow-x-auto text-rose-300 max-h-72">
                  {JSON.stringify(inspectLog.before || {}, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">State After Mutation</h4>
                <pre className="text-xs font-mono bg-[#090A0C] p-3 rounded-lg border border-emerald-500/20 overflow-x-auto text-emerald-300 max-h-72">
                  {JSON.stringify(inspectLog.after || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-[#232730] text-right">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-1.5 bg-[#181B22] hover:bg-zinc-800 text-zinc-300 hover:text-white font-mono rounded-lg transition-colors text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
