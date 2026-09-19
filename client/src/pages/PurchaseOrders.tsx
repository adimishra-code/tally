import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import ReceiveGoodsModal from '../components/ReceiveGoodsModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { IconExport, IconScan, IconInbox } from '../components/Icons';

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
      link.setAttribute('download', `purchase_orders_${new Date().toISOString().slice(0, 10)}.csv`);
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
  const inFulfillmentCount =
    pos?.filter((po: any) => ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(po.status)).length || 0;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'PENDING_APPROVAL':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'APPROVED':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'SENT':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'PARTIALLY_RECEIVED':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'RECEIVED':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'CLOSED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'CANCELLED':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Purchase Orders</h2>
          <p className="text-slate-400 text-sm mt-0.5">Inbound procurement and stock receiving</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {pos && pos.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-sm text-sm flex items-center gap-1.5"
            >
              <IconExport className="w-4 h-4 text-slate-400" />
              <span>Export CSV</span>
            </button>
          )}
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-2.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-sm text-sm flex items-center gap-2"
          >
            <IconScan className="w-4 h-4 text-slate-400" />
            <span>Scan Barcode</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-500/25 text-sm"
          >
            {showForm ? 'Cancel' : '+ New Purchase Order'}
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-md shadow-black/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Orders</div>
          <div className="text-2xl sm:text-3xl font-black text-white">{pos?.length || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Active & historical POs</div>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-md shadow-black/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Value</div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">${totalSpend.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-1">Committed procurement spend</div>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-md shadow-black/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pending Approval</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{pendingActionCount}</div>
          <div className="text-xs text-slate-400 mt-1">Awaiting procurement sign-off</div>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-md shadow-black/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">In Fulfillment</div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-400">{inFulfillmentCount}</div>
          <div className="text-xs text-slate-400 mt-1">{receivedCount} received & closed</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-4 flex flex-col md:flex-row items-center gap-3 shadow-md shadow-black/20">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-3 text-slate-500">🔍</span>
          <input
            type="text"
            placeholder="Search by PO number or supplier name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
          />
        </div>
        <div className="w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-56 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="SENT">Sent</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Received</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 space-y-4 shadow-xl shadow-black/25 text-white">
          <h3 className="text-lg font-bold text-white mb-2">New Purchase Order</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier Name*</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="e.g. Acme Industrial Supply"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Warehouse*</label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                  required
                >
                  <option value="">Select warehouse...</option>
                  {warehouses?.map((wh: any) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300">Line Items*</label>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  + Add Line
                </button>
              </div>
              <div className="space-y-2">
                {formData.lines.map((line, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(index, 'productId', e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                      required
                    >
                      <option value="">Select product...</option>
                      {products?.map((p: any) => (
                        <option key={p._id} value={p._id}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={line.orderedQty}
                      onChange={(e) => updateLine(index, 'orderedQty', parseInt(e.target.value))}
                      placeholder="Qty"
                      className="w-24 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-mono"
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitCost}
                      onChange={(e) => updateLine(index, 'unitCost', parseFloat(e.target.value))}
                      placeholder="Unit Cost"
                      className="w-32 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-mono"
                      required
                    />
                    {formData.lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-md shadow-blue-500/25 disabled:opacity-50 text-sm"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </form>
        </div>
      )}

      {/* PO List */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-hidden shadow-md shadow-black/20">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading purchase orders...</div>
        ) : !pos || pos.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No purchase orders found</div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {pos.map((po: any) => {
              const total = po.lines.reduce((sum: number, line: any) => sum + line.orderedQty * line.unitCost, 0);
              return (
                <div key={po._id} className="p-6 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-white font-mono">{po.poNumber}</h3>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase border ${getStatusColor(po.status)}`}>
                          {po.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Supplier: <span className="font-semibold text-slate-200">{po.supplierName}</span> • Created:{' '}
                        {new Date(po.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-400 font-mono">${total.toFixed(2)}</div>
                      <div className="text-xs text-slate-400">{po.lines.length} items</div>
                    </div>
                  </div>

                  {/* Lines Preview */}
                  <div className="mb-4 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 space-y-1 font-mono">
                    {po.lines.slice(0, 2).map((line: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span>
                          • {line.orderedQty} × {line.productId?.name || 'Product'} @ ${line.unitCost}
                        </span>
                        {line.receivedQty > 0 && (
                          <span className="text-emerald-400 font-bold">({line.receivedQty} received)</span>
                        )}
                      </div>
                    ))}
                    {po.lines.length > 2 && <div className="text-slate-500">+ {po.lines.length - 2} more...</div>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap items-center">
                    {canReceiveGoods(po.status) && (
                      <button
                        onClick={() => setReceivingPo(po)}
                        className="px-3.5 py-1.5 text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <IconInbox className="w-4 h-4" />
                        <span>Receive Goods</span>
                      </button>
                    )}
                    {getNextActions(po.status).map((action) => (
                      <button
                        key={action}
                        onClick={() => transitionMutation.mutate({ id: po._id, nextStatus: action })}
                        disabled={transitionMutation.isPending}
                        className="px-3 py-1.5 text-xs bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {action.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Goods Receiving Modal */}
      {receivingPo && (
        <ReceiveGoodsModal
          po={receivingPo}
          onClose={() => setReceivingPo(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
          }}
        />
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
