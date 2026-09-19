import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import PickOrderModal from '../components/PickOrderModal';
import ShipOrderModal from '../components/ShipOrderModal';
import { IconExport, IconPackage, IconTruck, IconClipboard } from '../components/Icons';

export default function SalesOrders() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pickingSo, setPickingSo] = useState<any | null>(null);
  const [shippingSo, setShippingSo] = useState<any | null>(null);
  const [viewingShipmentsSo, setViewingShipmentsSo] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    warehouseId: '',
    lines: [{ productId: '', orderedQty: 1 }],
  });

  const { data: sos, isLoading } = useQuery({
    queryKey: ['sales-orders', statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      const { data } = await api.get(`/sales-orders?${params.toString()}`);
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

      const response = await api.get(`/sales-orders/export/csv?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_orders_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Sales orders exported to CSV');
    } catch {
      toast.error('Failed to export sales orders');
    }
  };

  const totalOrders = sos?.length || 0;
  const totalUnitsOrdered =
    sos?.reduce(
      (sum: number, so: any) =>
        sum + (so.lines?.reduce((lSum: number, l: any) => lSum + (l.orderedQty || 0), 0) || 0),
      0
    ) || 0;
  const needsActionCount =
    sos?.filter((so: any) => ['DRAFT', 'CONFIRMED', 'PICKING', 'PACKED'].includes(so.status)).length || 0;
  const inTransitOrDelivered =
    sos?.filter((so: any) => ['SHIPPED', 'PARTIALLY_SHIPPED', 'DELIVERED'].includes(so.status)).length || 0;

  // Query shipments for selected order
  const { data: shipments, isLoading: isLoadingShipments } = useQuery({
    queryKey: ['shipments', viewingShipmentsSo?._id],
    queryFn: async () => {
      if (!viewingShipmentsSo) return [];
      const { data } = await api.get(`/sales-orders/${viewingShipmentsSo._id}/shipments`);
      return data;
    },
    enabled: !!viewingShipmentsSo,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/sales-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success('Sales order created successfully');
      setShowForm(false);
      setFormData({
        customerName: '',
        warehouseId: '',
        lines: [{ productId: '', orderedQty: 1 }],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create sales order');
    },
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) =>
      api.post(`/sales-orders/${id}/transition`, { nextStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success('Status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    },
  });

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { productId: '', orderedQty: 1 }],
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
      case 'CONFIRMED':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'PICKING':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'PACKED':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'PARTIALLY_SHIPPED':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'SHIPPED':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'DELIVERED':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getNextActions = (status: string) => {
    const actions: Record<string, string[]> = {
      DRAFT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['CANCELLED'],
      PICKING: ['PACKED', 'CANCELLED'],
      PACKED: ['CANCELLED'],
      PARTIALLY_SHIPPED: [],
      SHIPPED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };
    return actions[status] || [];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Sales Orders</h2>
          <p className="text-slate-400 text-sm mt-0.5">Outbound customer fulfillment and shipments</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {sos && sos.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-sm text-sm flex items-center gap-1.5"
            >
              <IconExport className="w-4 h-4 text-slate-400" />
              <span>Export CSV</span>
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-500/25 text-sm"
          >
            {showForm ? 'Cancel' : '+ New Sales Order'}
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-md shadow-black/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Sales Orders</div>
          <div className="text-2xl sm:text-3xl font-black text-white">{totalOrders}</div>
          <div className="text-xs text-slate-400 mt-1">Orders placed to date</div>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-md shadow-black/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Units Ordered</div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">{totalUnitsOrdered.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">Aggregated line demand</div>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-md shadow-black/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Needs Fulfillment</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{needsActionCount}</div>
          <div className="text-xs text-slate-400 mt-1">Draft, Confirmed, Picking, Packed</div>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-md shadow-black/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dispatched / Done</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">{inTransitOrDelivered}</div>
          <div className="text-xs text-slate-400 mt-1">Shipped & Delivered</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-4 flex flex-col md:flex-row items-center gap-3 shadow-md shadow-black/20">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-3 text-slate-500">🔍</span>
          <input
            type="text"
            placeholder="Search by Order # or Customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
          />
        </div>
        <div className="w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-64 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium"
          >
            <option value="">All Fulfillment Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PICKING">Picking</option>
            <option value="PACKED">Packed</option>
            <option value="PARTIALLY_SHIPPED">Partially Shipped</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 space-y-4 shadow-xl shadow-black/25 text-white">
          <h3 className="text-lg font-bold text-white mb-2">New Sales Order</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name*</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="e.g. Apex Global Logistics"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fulfillment Warehouse*</label>
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
                      onChange={(e) => updateLine(index, 'orderedQty', parseInt(e.target.value) || 1)}
                      placeholder="Qty"
                      className="w-28 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-mono"
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
              {createMutation.isPending ? 'Creating...' : 'Create Sales Order'}
            </button>
          </form>
        </div>
      )}

      {/* SO List */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-hidden shadow-md shadow-black/20">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading sales orders...</div>
        ) : !sos || sos.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No sales orders found</div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {sos.map((so: any) => {
              const canPick = so.status === 'CONFIRMED';
              const canShip = ['PICKING', 'PACKED', 'PARTIALLY_SHIPPED'].includes(so.status);
              const anyShipped = so.lines.some((l: any) => l.shippedQty > 0);

              return (
                <div key={so._id} className="p-6 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-white font-mono">{so.orderNumber}</h3>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase border ${getStatusColor(so.status)}`}>
                          {so.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Customer: <span className="font-semibold text-slate-200">{so.customerName}</span> • Warehouse:{' '}
                        <span className="font-semibold text-slate-200">{so.warehouseId?.name || 'Warehouse'}</span> • Created:{' '}
                        {new Date(so.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-200 font-mono">{so.lines.length} Line Items</div>
                    </div>
                  </div>

                  {/* Lines Breakdown */}
                  <div className="mb-4 bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/60 space-y-1.5 font-mono text-xs">
                    {so.lines.map((line: any, idx: number) => (
                      <div key={idx} className="text-slate-300 flex items-center justify-between">
                        <div>
                          • <span className="font-bold text-white">{line.orderedQty}×</span>{' '}
                          {line.productId?.sku ? <span className="text-blue-400 font-semibold">{line.productId.sku} - </span> : null}
                          {line.productId?.name || 'Product'}
                        </div>
                        <div className="flex gap-4 text-slate-400">
                          <span>Picked: <strong className="text-amber-300">{line.pickedQty || 0}</strong></span>
                          <span>Shipped: <strong className="text-emerald-400">{line.shippedQty || 0}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Controls */}
                  <div className="flex gap-2 flex-wrap items-center">
                    {canPick && (
                      <button
                        onClick={() => setPickingSo(so)}
                        className="px-3.5 py-1.5 text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <IconPackage className="w-4 h-4" />
                        <span>Pick Items</span>
                      </button>
                    )}

                    {canShip && (
                      <button
                        onClick={() => setShippingSo(so)}
                        className="px-3.5 py-1.5 text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <IconTruck className="w-4 h-4" />
                        <span>Ship Order</span>
                      </button>
                    )}

                    {anyShipped && (
                      <button
                        onClick={() => setViewingShipmentsSo(so)}
                        className="px-3.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <IconClipboard className="w-4 h-4 text-slate-400" />
                        <span>Shipments Tracking</span>
                      </button>
                    )}

                    {getNextActions(so.status).map((action) => (
                      <button
                        key={action}
                        onClick={() => transitionMutation.mutate({ id: so._id, nextStatus: action })}
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

      {/* Pick Modal */}
      {pickingSo && (
        <PickOrderModal
          so={pickingSo}
          onClose={() => setPickingSo(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
          }}
        />
      )}

      {/* Ship Modal */}
      {shippingSo && (
        <ShipOrderModal
          so={shippingSo}
          onClose={() => setShippingSo(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
          }}
        />
      )}

      {/* Shipments Drawer / Modal */}
      {viewingShipmentsSo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white font-mono">
                  Shipments for {viewingShipmentsSo.orderNumber}
                </h3>
                <p className="text-xs text-slate-400">Customer: {viewingShipmentsSo.customerName}</p>
              </div>
              <button
                onClick={() => setViewingShipmentsSo(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-800/80">
              {isLoadingShipments ? (
                <div className="py-8 text-center text-slate-500 text-sm">Loading shipments...</div>
              ) : !shipments || shipments.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">No shipments found for this order.</div>
              ) : (
                shipments.map((s: any) => (
                  <div key={s._id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg text-xs">
                          {s.carrier || 'Standard'}
                        </span>
                        {s.trackingNumber && (
                          <span className="font-mono text-xs text-blue-400 font-semibold">
                            AWB: {s.trackingNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(s.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 font-mono space-y-1">
                      <div className="font-bold text-slate-200 mb-1">Dispatched Lines:</div>
                      {s.lines.map((l: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{l.productId?.name || 'Product'}</span>
                          <span className="font-bold text-emerald-400">{l.shippedQty} units</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                onClick={() => setViewingShipmentsSo(null)}
                className="px-4 py-2 bg-slate-800 text-slate-200 font-medium rounded-xl hover:bg-slate-700 transition-colors text-sm"
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
