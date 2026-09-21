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
      link.setAttribute('download', `tally_sales_orders_${new Date().toISOString().slice(0, 10)}.csv`);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-zinc-900 text-zinc-400 border-zinc-700';
      case 'CONFIRMED':
        return 'bg-[#141720] text-amber-400 border-amber-500/40';
      case 'PICKING':
        return 'bg-amber-950/40 text-amber-300 border-amber-600/50';
      case 'PACKED':
        return 'bg-zinc-800 text-zinc-200 border-zinc-600';
      case 'PARTIALLY_SHIPPED':
        return 'bg-amber-950/40 text-amber-400 border-amber-700/50';
      case 'SHIPPED':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40';
      case 'DELIVERED':
        return 'bg-emerald-950/50 text-emerald-400 border-emerald-600/50';
      case 'CANCELLED':
        return 'bg-rose-950/40 text-rose-400 border-rose-800/60';
      default:
        return 'bg-zinc-900 text-zinc-400 border-zinc-700';
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 led-pulse-amber" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Outbound Sales Orders
            </h1>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 font-mono">
            Customer order demand • Wave picking • Dispatch & delivery tracking
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {sos && sos.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-[#12141A] border border-[#262B35] hover:border-amber-500/50 hover:bg-[#181C24] text-zinc-200 font-mono font-semibold rounded-lg transition-all shadow-xs text-xs flex items-center gap-1.5 btn-tactile"
            >
              <IconExport className="w-4 h-4 text-amber-400" />
              <span>EXPORT_CSV</span>
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-lg transition-all shadow-xs text-xs btn-tactile"
          >
            {showForm ? 'DISMISS_FORM' : '+ CREATE_SALES_ORDER'}
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Total Orders
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-mono">{totalOrders}</div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">ALL_OUTBOUND_ORDERS</div>
        </div>
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Units Demanded
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
            {totalUnitsOrdered.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">ORDERED_UNITS</div>
        </div>
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Fulfillment Queue
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 font-mono">{needsActionCount}</div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">CONFIRMED_OR_PICKING</div>
        </div>
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Dispatched / Done
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            {inTransitOrDelivered}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">SHIPPED_OR_DELIVERED</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-3 flex flex-col md:flex-row items-center gap-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by Order # or Customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500 outline-none text-xs font-mono"
          />
        </div>
        <div className="w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-56 px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-xs font-mono text-zinc-300 outline-none focus:border-amber-500"
          >
            <option value="">ALL_STATUSES</option>
            <option value="DRAFT">DRAFT</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PICKING">PICKING</option>
            <option value="PACKED">PACKED</option>
            <option value="PARTIALLY_SHIPPED">PARTIALLY_SHIPPED</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-5 space-y-4 shadow-lg text-zinc-100">
          <div className="flex items-center justify-between border-b border-[#232730] pb-3">
            <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase">
              Initiate Sales Order (Outbound)
            </h3>
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
                <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                  CUSTOMER_ACCOUNT*
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="e.g. Acme Industrial Supply"
                  className="w-full px-3.5 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500 outline-none text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                  DISPATCH_WAREHOUSE*
                </label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                  required
                >
                  <option value="">Choose dispatch facility...</option>
                  {warehouses?.map((wh: any) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                  DEMAND_LINE_ITEMS*
                </label>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-xs font-mono font-semibold text-amber-400 hover:text-amber-300"
                >
                  + ADD_LINE
                </button>
              </div>

              {formData.lines.map((line, index) => (
                <div key={index} className="flex gap-2 p-2.5 bg-[#12141A] rounded-lg border border-[#232730]">
                  <select
                    value={line.productId}
                    onChange={(e) => updateLine(index, 'productId', e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[#090A0C] border border-[#262B35] rounded-md text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                    required
                  >
                    <option value="">Select SKU...</option>
                    {products?.map((p: any) => (
                      <option key={p._id} value={p._id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={line.orderedQty}
                    onChange={(e) => updateLine(index, 'orderedQty', parseInt(e.target.value) || 1)}
                    placeholder="Qty"
                    className="w-24 px-3 py-1.5 bg-[#090A0C] border border-[#262B35] rounded-md text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono text-center"
                    required
                  />
                  {formData.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="px-2 text-rose-400 hover:text-rose-300 font-mono text-xs"
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
                {createMutation.isPending ? 'CREATING...' : 'COMMIT_SALES_ORDER'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-[#0E1014] rounded-xl border border-[#232730] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">
            QUERYING OUTBOUND FULFILLMENT STREAM...
          </div>
        ) : !sos || sos.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">
            NO SALES ORDERS FOUND
          </div>
        ) : (
          <div className="divide-y divide-[#1C2028]">
            {sos.map((so: any) => {
              const canPick = so.status === 'CONFIRMED';
              const canShip = ['PICKING', 'PACKED', 'PARTIALLY_SHIPPED'].includes(so.status);
              const anyShipped = so.lines.some((l: any) => l.shippedQty > 0);

              return (
                <div key={so._id} className="p-4 hover:bg-[#13161C] transition-colors industrial-row">
                  <div className="flex items-start justify-between mb-2.5">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <code className="text-xs font-mono text-amber-400 font-bold bg-[#171A21] px-2 py-0.5 rounded border border-[#2B313E]">
                          {so.orderNumber}
                        </code>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase border ${getStatusBadge(
                            so.status
                          )}`}
                        >
                          {so.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Customer: <span className="font-semibold text-zinc-200">{so.customerName}</span> • Warehouse:{' '}
                        <span className="font-semibold text-zinc-200">{so.warehouseId?.name || 'Warehouse'}</span> •{' '}
                        {new Date(so.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs font-bold text-zinc-300">
                      {so.lines.length} Line Items
                    </div>
                  </div>

                  {/* Lines Breakdown */}
                  <div className="mb-3 bg-[#12141A] rounded-lg p-2.5 border border-[#20242D] space-y-1 font-mono text-xs">
                    {so.lines.map((line: any, idx: number) => (
                      <div key={idx} className="text-zinc-300 flex items-center justify-between">
                        <div>
                          • <span className="font-bold text-zinc-100">{line.orderedQty}×</span>{' '}
                          {line.productId?.sku ? <span className="text-amber-400 font-semibold">{line.productId.sku} - </span> : null}
                          {line.productId?.name || 'Product'}
                        </div>
                        <div className="flex gap-3 text-[11px] text-zinc-500">
                          <span>PICKED: <strong className="text-amber-400">{line.pickedQty || 0}</strong></span>
                          <span>SHIPPED: <strong className="text-emerald-400">{line.shippedQty || 0}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Controls */}
                  <div className="flex gap-2 flex-wrap items-center font-mono text-[10px]">
                    {canPick && (
                      <button
                        onClick={() => setPickingSo(so)}
                        className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold rounded transition-colors flex items-center gap-1.5"
                      >
                        <IconPackage className="w-3.5 h-3.5" />
                        <span>PICK_ITEMS</span>
                      </button>
                    )}

                    {canShip && (
                      <button
                        onClick={() => setShippingSo(so)}
                        className="px-3 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/40 font-bold rounded transition-colors flex items-center gap-1.5"
                      >
                        <IconTruck className="w-3.5 h-3.5" />
                        <span>SHIP_ORDER</span>
                      </button>
                    )}

                    {anyShipped && (
                      <button
                        onClick={() => setViewingShipmentsSo(so)}
                        className="px-2.5 py-1 bg-[#161921] hover:bg-[#1E232E] text-zinc-300 border border-[#272D3A] rounded transition-colors flex items-center gap-1.5"
                      >
                        <IconClipboard className="w-3.5 h-3.5 text-zinc-500" />
                        <span>WAYBILL_TRACKING</span>
                      </button>
                    )}

                    {getNextActions(so.status).map((action) => (
                      <button
                        key={action}
                        onClick={() => transitionMutation.mutate({ id: so._id, nextStatus: action })}
                        disabled={transitionMutation.isPending}
                        className="px-2.5 py-1 bg-[#161921] hover:bg-[#1E232E] hover:border-amber-500/40 text-zinc-300 hover:text-amber-400 border border-[#272D3A] rounded transition-colors disabled:opacity-50"
                      >
                        &rarr; {action.replace(/_/g, ' ')}
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

      {/* Shipments Modal */}
      {viewingShipmentsSo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0E1014] border border-[#2B303C] rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[85vh] flex flex-col text-zinc-100">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase">
                  Waybill Records: {viewingShipmentsSo.orderNumber}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Customer: {viewingShipmentsSo.customerName}</p>
              </div>
              <button
                onClick={() => setViewingShipmentsSo(null)}
                className="text-zinc-400 hover:text-zinc-100 font-mono text-xs"
              >
                [ESC]
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-[#1C2028]">
              {isLoadingShipments ? (
                <div className="py-8 text-center text-zinc-500 font-mono text-xs">QUERYING CARRIER TRACKING...</div>
              ) : !shipments || shipments.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 font-mono text-xs">No dispatched shipments logged.</div>
              ) : (
                shipments.map((s: any) => (
                  <div key={s._id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200 bg-[#12141A] border border-[#262B35] px-2 py-0.5 rounded font-mono">
                          {s.carrier || 'Standard'}
                        </span>
                        {s.trackingNumber && (
                          <span className="font-mono text-xs text-amber-400 font-bold">
                            AWB: {s.trackingNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {new Date(s.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-300 bg-[#12141A] p-3 rounded-lg border border-[#20242D] font-mono space-y-1">
                      <div className="font-bold text-zinc-400 text-[10px] uppercase mb-1">Dispatched Manifest:</div>
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

            <div className="pt-2 border-t border-[#232730] text-right">
              <button
                onClick={() => setViewingShipmentsSo(null)}
                className="px-4 py-1.5 bg-[#12141A] text-zinc-300 border border-[#262B35] font-mono font-medium rounded-lg hover:bg-[#181C25] transition-colors text-xs"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
