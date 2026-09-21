import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import ReceiveGoodsModal from '../components/ReceiveGoodsModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { IconExport, IconScan } from '../components/Icons';

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [receivingPo, setReceivingPo] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    supplierName: '',
    warehouseId: '',
    lines: [{ productId: '', orderedQty: 1, unitCost: 0 }],
  });

  const { data: pos, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      const { data } = await api.get(`/purchase-orders?${params.toString()}`);
      return data;
    },
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data } = await api.get('/warehouses');
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
  });

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const response = await api.get(`/purchase-orders/export/csv?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tally_purchase_orders_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Purchase orders exported to CSV');
    } catch {
      toast.error('Failed to export purchase orders');
    }
  };

  const totalSpend =
    pos?.reduce((acc: number, po: any) => {
      const poTotal =
        po.lines?.reduce((sum: number, l: any) => sum + (l.orderedQty || 0) * (l.unitCost || 0), 0) || 0;
      return acc + poTotal;
    }, 0) || 0;
  const pendingActionCount =
    pos?.filter((po: any) => ['DRAFT', 'PENDING_APPROVAL'].includes(po.status)).length || 0;
  const receivedCount =
    pos?.filter((po: any) => ['RECEIVED', 'CLOSED'].includes(po.status)).length || 0;

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/purchase-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order created successfully');
      setShowForm(false);
      setFormData({
        supplierName: '',
        warehouseId: '',
        lines: [{ productId: '', orderedQty: 1, unitCost: 0 }],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create purchase order');
    },
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) =>
      api.post(`/purchase-orders/${id}/transition`, { nextStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    },
  });

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { productId: '', orderedQty: 1, unitCost: 0 }],
    });
  };

  const removeLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index),
    });
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-zinc-900 text-zinc-400 border-zinc-700';
      case 'PENDING_APPROVAL':
        return 'bg-amber-950/40 text-amber-300 border-amber-800/60';
      case 'APPROVED':
        return 'bg-[#141720] text-amber-400 border-amber-500/40';
      case 'SENT':
        return 'bg-zinc-800 text-zinc-200 border-zinc-600';
      case 'PARTIALLY_RECEIVED':
        return 'bg-amber-950/40 text-amber-400 border-amber-600/50';
      case 'RECEIVED':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40';
      case 'CLOSED':
        return 'bg-zinc-900 text-zinc-500 border-zinc-800';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-rose-950/40 text-rose-400 border-rose-800/60';
      default:
        return 'bg-zinc-900 text-zinc-400 border-zinc-700';
    }
  };

  const getNextActions = (status: string) => {
    const actions: Record<string, string[]> = {
      DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
      PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
      APPROVED: ['SENT', 'CANCELLED'],
      REJECTED: ['DRAFT'],
      SENT: ['CANCELLED'],
      PARTIALLY_RECEIVED: ['CLOSED'],
      RECEIVED: ['CLOSED'],
    };
    return actions[status] || [];
  };

  const canReceiveGoods = (status: string) => {
    return ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(status);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 led-pulse-emerald" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Inbound Purchase Orders
            </h1>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 font-mono">
            Procurement pipelines • Formal state machine transitions • Goods receiving
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {pos && pos.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-[#12141A] border border-[#262B35] hover:border-amber-500/50 hover:bg-[#181C24] text-zinc-200 font-mono font-semibold rounded-lg transition-all shadow-xs text-xs flex items-center gap-1.5 btn-tactile"
            >
              <IconExport className="w-4 h-4 text-amber-400" />
              <span>EXPORT_CSV</span>
            </button>
          )}
          <button
            onClick={() => setShowScanner(true)}
            className="px-3.5 py-2 bg-[#12141A] border border-[#262B35] hover:border-amber-500/50 hover:bg-[#181C24] text-zinc-200 font-mono font-semibold rounded-lg transition-all shadow-xs text-xs flex items-center gap-2 btn-tactile"
          >
            <IconScan className="w-4 h-4 text-amber-400" />
            <span>SCAN_BARCODE</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-lg transition-all shadow-xs text-xs btn-tactile"
          >
            {showForm ? 'DISMISS_FORM' : '+ CREATE_PURCHASE_ORDER'}
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Total Orders
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-mono">{pos?.length || 0}</div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">ALL_INBOUND_POS</div>
        </div>
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Committed Value
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            ${totalSpend.toFixed(2)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">GROSS_PROCUREMENT</div>
        </div>
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Pending Action
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">{pendingActionCount}</div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">DRAFT_OR_APPROVAL</div>
        </div>
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Received Complete
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-300 font-mono">{receivedCount}</div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">STOCKED_TO_LEDGER</div>
        </div>
      </div>

      {/* New Purchase Order Form */}
      {showForm && (
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#232730] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase">
                Initiate New Purchase Order (Draft)
              </h3>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-zinc-500 hover:text-zinc-200 font-mono text-xs"
            >
              [CLOSE]
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  SUPPLIER_NAME*
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pacific Supply Corp"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500 outline-none text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  RECEIVING_WAREHOUSE*
                </label>
                <select
                  required
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                >
                  <option value="">Choose receiving facility...</option>
                  {warehouses?.map((wh: any) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                  PROCUREMENT_LINE_ITEMS
                </span>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-xs font-mono font-semibold text-amber-400 hover:text-amber-300"
                >
                  + ADD_LINE
                </button>
              </div>

              {formData.lines.map((line, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 p-3 rounded-lg bg-[#12141A] border border-[#232730]"
                >
                  <div className="flex-1">
                    <select
                      required
                      value={line.productId}
                      onChange={(e) => updateLine(index, 'productId', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#090A0C] border border-[#262B35] rounded-md text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                    >
                      <option value="">Select Catalog SKU...</option>
                      {products?.map((p: any) => (
                        <option key={p._id} value={p._id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={line.orderedQty}
                      onChange={(e) => updateLine(index, 'orderedQty', parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 bg-[#090A0C] border border-[#262B35] rounded-md text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono text-center"
                      required
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit Cost"
                      value={line.unitCost}
                      onChange={(e) => updateLine(index, 'unitCost', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-[#090A0C] border border-[#262B35] rounded-md text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono text-right"
                      required
                    />
                  </div>
                  {formData.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-rose-400 hover:text-rose-300 font-mono text-xs px-1.5"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[#262B35] text-zinc-400 hover:text-zinc-100 font-mono text-xs rounded-lg"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-mono font-bold text-xs rounded-lg shadow-xs btn-tactile"
              >
                {createMutation.isPending ? 'CREATING...' : 'COMMIT_PURCHASE_ORDER'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-3 flex flex-col md:flex-row items-center gap-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by PO number or supplier name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500 outline-none text-xs font-mono"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-xs font-mono text-zinc-300 outline-none focus:border-amber-500"
          >
            <option value="">ALL_STATUSES</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SENT">SENT</option>
            <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#0E1014] rounded-xl border border-[#232730] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans">
            <thead className="bg-[#12141A] border-b border-[#232730] text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">PO_NUMBER</th>
                <th className="px-4 py-3">SUPPLIER</th>
                <th className="px-4 py-3">FACILITY</th>
                <th className="px-4 py-3">ITEMS</th>
                <th className="px-4 py-3 text-right">GROSS_AMOUNT</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3 text-right">STATE_MACHINE_TRANSITIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C2028] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-mono">
                    FETCHING INBOUND PROCUREMENT STREAM...
                  </td>
                </tr>
              ) : !pos || pos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-mono">
                    NO PURCHASE ORDERS RECORDED MATCHING FILTERS
                  </td>
                </tr>
              ) : (
                pos.map((po: any) => {
                  const totalAmount = po.lines?.reduce(
                    (sum: number, l: any) => sum + (l.orderedQty || 0) * (l.unitCost || 0),
                    0
                  );
                  const totalUnits = po.lines?.reduce((sum: number, l: any) => sum + (l.orderedQty || 0), 0);
                  const nextActions = getNextActions(po.status);
                  const canRecv = canReceiveGoods(po.status);

                  return (
                    <tr key={po._id} className="hover:bg-[#13161C] transition-colors industrial-row">
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-amber-400 font-bold bg-[#171A21] px-2 py-0.5 rounded border border-[#2B313E]">
                          {po.poNumber}
                        </code>
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-100">{po.supplierName}</td>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">{po.warehouseId?.name || 'Central'}</td>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                        {po.lines?.length || 0} SKUs ({totalUnits} pcs)
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-zinc-200">
                        ${totalAmount?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded border ${getStatusBadge(
                            po.status
                          )}`}
                        >
                          {po.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {canRecv && (
                            <button
                              onClick={() => setReceivingPo(po)}
                              className="px-2.5 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/40 font-mono font-bold text-[10px] rounded transition-colors"
                            >
                              RECEIVE_GOODS
                            </button>
                          )}
                          {nextActions.map((next) => (
                            <button
                              key={next}
                              onClick={() => transitionMutation.mutate({ id: po._id, nextStatus: next })}
                              className="px-2 py-1 bg-[#161921] hover:bg-[#1E232E] hover:border-amber-500/40 text-zinc-300 hover:text-amber-400 border border-[#272D3A] font-mono text-[10px] rounded transition-colors"
                            >
                              &rarr; {next.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Goods Modal */}
      {receivingPo && (
        <ReceiveGoodsModal
          po={receivingPo}
          onClose={() => setReceivingPo(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })}
        />
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && <BarcodeScannerModal onClose={() => setShowScanner(false)} />}
    </div>
  );
}
