import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Warehouse, Product, Bin } from '../types';
import { IconExport } from '../components/Icons';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<{ productId: string; name: string; sku: string } | null>(null);

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW' | 'OUT'>('ALL');
  const [sortBy, setSortBy] = useState<'balance_desc' | 'balance_asc' | 'sku' | 'name'>('balance_desc');

  // Forms
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    warehouseId: '',
    binId: '',
    type: 'increase', // 'increase' | 'decrease'
    quantity: 1,
    reason: '',
  });

  const [transferForm, setTransferForm] = useState({
    productId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    quantity: 1,
    reason: '',
  });

  // Queries
  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data } = await api.get('/warehouses');
      return data;
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', warehouseId],
    queryFn: async () => {
      if (!warehouseId) return [];
      const { data } = await api.get(`/stock/warehouse/${warehouseId}`);
      return data;
    },
    enabled: !!warehouseId,
  });

  // Fetch bins for adjustment modal
  const targetAdjustmentWh = adjustForm.warehouseId || warehouseId;
  const { data: adjustmentBins } = useQuery<Bin[]>({
    queryKey: ['bins', targetAdjustmentWh],
    queryFn: async () => {
      if (!targetAdjustmentWh) return [];
      const { data } = await api.get(`/bins/warehouse/${targetAdjustmentWh}`);
      return data;
    },
    enabled: !!targetAdjustmentWh,
  });

  // Fetch stock history for drilldown
  const { data: stockHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['stock-history', historyProduct?.productId, warehouseId],
    queryFn: async () => {
      if (!historyProduct || !warehouseId) return [];
      const { data } = await api.get(`/stock/history/${historyProduct.productId}/${warehouseId}`);
      return data;
    },
    enabled: !!historyProduct && !!warehouseId,
  });

  // Derived filtered & sorted inventory
  const filteredInventory = (inventory || [])
    .filter((item: any) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSku = item.sku?.toLowerCase().includes(q);
        const matchesName = item.name?.toLowerCase().includes(q);
        if (!matchesSku && !matchesName) return false;
      }

      const rp = item.reorderPoint ?? 10;
      if (stockFilter === 'IN_STOCK') return item.balance > rp;
      if (stockFilter === 'LOW') return item.balance > 0 && item.balance <= rp;
      if (stockFilter === 'OUT') return item.balance === 0;
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'balance_desc') return b.balance - a.balance;
      if (sortBy === 'balance_asc') return a.balance - b.balance;
      if (sortBy === 'sku') return (a.sku || '').localeCompare(b.sku || '');
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

  // Metrics
  const totalSkus = inventory?.length || 0;
  const totalUnits = inventory?.reduce((acc: number, item: any) => acc + (item.balance || 0), 0) || 0;
  const lowStockCount = inventory?.filter((item: any) => item.balance > 0 && item.balance <= (item.reorderPoint ?? 10)).length || 0;
  const outOfStockCount = inventory?.filter((item: any) => item.balance === 0).length || 0;
  const totalValuation = inventory?.reduce((acc: number, item: any) => acc + (item.valuation ?? ((item.balance || 0) * (item.costPrice || 0))), 0) || 0;

  // Export CSV
  const handleExportCsv = () => {
    if (!inventory || inventory.length === 0) {
      toast.error('No inventory records to export');
      return;
    }

    const selectedWh = warehouses?.find((w) => w._id === warehouseId);
    const whName = selectedWh ? selectedWh.name.replace(/\s+/g, '_') : 'warehouse';

    const headers = ['SKU', 'Product Name', 'Unit', 'Balance', 'Reorder Point', 'Cost Price', 'Valuation', 'Status', 'Last Mutation'];
    const rows = filteredInventory.map((item: any) => {
      const rp = item.reorderPoint ?? 10;
      const status = item.balance === 0 ? 'Out of Stock' : item.balance <= rp ? 'Low Stock' : 'In Stock';
      const val = (item.valuation ?? ((item.balance || 0) * (item.costPrice || 0))).toFixed(2);
      return [
        `"${item.sku || ''}"`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${item.unit || ''}"`,
        item.balance ?? 0,
        rp,
        (item.costPrice ?? 0).toFixed(2),
        val,
        `"${status}"`,
        `"${item.lastUpdated ? new Date(item.lastUpdated).toISOString() : ''}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tally_inventory_${whName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Inventory ledger report downloaded');
  };

  const handleQuickAdjust = (item: any) => {
    setAdjustForm({
      productId: item.productId,
      warehouseId: warehouseId,
      binId: '',
      type: 'increase',
      quantity: 1,
      reason: 'Physical count audit verification',
    });
    setShowAdjustModal(true);
  };

  const handleQuickTransfer = (item: any) => {
    setTransferForm({
      productId: item.productId,
      fromWarehouseId: warehouseId,
      toWarehouseId: '',
      quantity: 1,
      reason: 'Rebalance fulfillment inventory',
    });
    setShowTransferModal(true);
  };

  // Mutations
  const adjustMutation = useMutation({
    mutationFn: (data: {
      productId: string;
      warehouseId: string;
      quantityChange: number;
      reason: string;
      binId?: string;
    }) => api.post('/stock/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-history'] });
      toast.success('Stock ledger entry recorded');
      setShowAdjustModal(false);
      setAdjustForm({
        productId: '',
        warehouseId: '',
        binId: '',
        type: 'increase',
        quantity: 1,
        reason: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to adjust stock');
    },
  });

  const transferMutation = useMutation({
    mutationFn: (data: {
      productId: string;
      fromWarehouseId: string;
      toWarehouseId: string;
      quantity: number;
      reason?: string;
    }) => api.post('/stock/transfer', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Transfer ledger entries recorded');
      setShowTransferModal(false);
      setTransferForm({
        productId: '',
        fromWarehouseId: '',
        toWarehouseId: '',
        quantity: 1,
        reason: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to transfer stock');
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyChange = adjustForm.type === 'increase' ? adjustForm.quantity : -adjustForm.quantity;
    adjustMutation.mutate({
      productId: adjustForm.productId,
      warehouseId: adjustForm.warehouseId || warehouseId,
      quantityChange: qtyChange,
      reason: adjustForm.reason,
      binId: adjustForm.binId || undefined,
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    transferMutation.mutate({
      productId: transferForm.productId,
      fromWarehouseId: transferForm.fromWarehouseId || warehouseId,
      toWarehouseId: transferForm.toWarehouseId,
      quantity: transferForm.quantity,
      reason: transferForm.reason || undefined,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Ledger Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 led-pulse-amber" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Stock Ledger & Inventory
            </h1>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 font-mono">
            Append-only transactional balance • Multi-zone bin verification
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {warehouseId && inventory && inventory.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-[#12141A] border border-[#262B35] hover:border-amber-500/50 hover:bg-[#181C24] text-zinc-200 font-mono font-semibold rounded-lg transition-all shadow-xs text-xs flex items-center gap-1.5 btn-tactile"
            >
              <IconExport className="w-4 h-4 text-amber-400" />
              <span>EXPORT_CSV</span>
            </button>
          )}
          <button
            onClick={() => {
              setTransferForm((prev) => ({ ...prev, fromWarehouseId: warehouseId }));
              setShowTransferModal(true);
            }}
            className="px-3.5 py-2 bg-[#12141A] border border-[#262B35] hover:border-zinc-500 hover:bg-[#181C24] text-zinc-200 font-mono font-semibold rounded-lg transition-all shadow-xs text-xs flex items-center gap-1.5 btn-tactile"
          >
            <span>↔</span>
            <span>TRANSFER_STOCK</span>
          </button>
          <button
            onClick={() => {
              setAdjustForm((prev) => ({ ...prev, warehouseId: warehouseId }));
              setShowAdjustModal(true);
            }}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-lg transition-all shadow-xs text-xs flex items-center gap-1.5 btn-tactile"
          >
            <span>+</span>
            <span>ADJUST_STOCK</span>
          </button>
        </div>
      </div>

      {/* Warehouse Selector Card */}
      <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex-1 max-w-md">
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
            LOCATION // TARGET_WAREHOUSE
          </label>
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setSearch('');
              setStockFilter('ALL');
            }}
            className="w-full px-3.5 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none text-xs font-mono font-medium"
          >
            <option value="">SELECT FACILITY TO INSPECT...</option>
            {warehouses?.map((wh) => (
              <option key={wh._id} value={wh._id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>
        {warehouseId && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14171F] border border-[#272C38] text-xs font-mono self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 led-pulse-emerald inline-block animate-pulse"></span>
            <span className="text-emerald-400 font-semibold">LEDGER_ACTIVE // ZERO_MUTABLE_DRIFT</span>
          </div>
        )}
      </div>

      {/* KPI Metrics Telemetry */}
      {warehouseId && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Active SKUs
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-mono">{totalSkus}</div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">TRACKED_IN_CATALOG</div>
          </div>
          <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
              On-Hand Units
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {totalUnits.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">PHYSICAL_ON_SHELF</div>
          </div>
          <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Stock Valuation
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
              ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">AT_COST_PRICE</div>
          </div>
          <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Reorder Risk
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 font-mono">{lowStockCount}</div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">AT_OR_BELOW_REORDER</div>
          </div>
          <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-4 shadow-sm col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Depleted Stock
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">{outOfStockCount}</div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">ZERO_BALANCE</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {warehouseId && (
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-3.5 flex flex-col md:flex-row items-center gap-3 shadow-sm">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Filter by SKU or product description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <div className="flex items-center bg-[#12141A] p-1 rounded-lg border border-[#262B35] text-xs font-mono font-semibold">
              <button
                onClick={() => setStockFilter('ALL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  stockFilter === 'ALL'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ALL ({totalSkus})
              </button>
              <button
                onClick={() => setStockFilter('IN_STOCK')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  stockFilter === 'IN_STOCK'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                OPTIMAL ({inventory ? inventory.filter((i: any) => i.balance > (i.reorderPoint ?? 10)).length : 0})
              </button>
              <button
                onClick={() => setStockFilter('LOW')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  stockFilter === 'LOW'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                LOW ({lowStockCount})
              </button>
              <button
                onClick={() => setStockFilter('OUT')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  stockFilter === 'OUT'
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                DEPLETED ({outOfStockCount})
              </button>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-[#12141A] border border-[#262B35] rounded-lg text-xs font-mono text-zinc-300 outline-none focus:border-amber-500"
            >
              <option value="balance_desc">SORT: STOCK DESC</option>
              <option value="balance_asc">SORT: STOCK ASC</option>
              <option value="sku">SORT: SKU [A-Z]</option>
              <option value="name">SORT: NAME [A-Z]</option>
            </select>
          </div>
        </div>
      )}

      {/* Inventory Ledger Table */}
      {warehouseId ? (
        <div className="bg-[#0E1014] rounded-xl border border-[#232730] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans">
              <thead className="bg-[#12141A] border-b border-[#232730] text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">SKU_IDENTIFIER</th>
                  <th className="px-4 py-3">CATALOG_NAME</th>
                  <th className="px-4 py-3">UNIT</th>
                  <th className="px-4 py-3 text-right">REORDER_PT</th>
                  <th className="px-4 py-3 text-right">AVAILABLE_ON_HAND</th>
                  <th className="px-4 py-3 text-right">VALUATION</th>
                  <th className="px-4 py-3">HEALTH_STATUS</th>
                  <th className="px-4 py-3">LAST_MUTATION</th>
                  <th className="px-4 py-3 text-center">OPERATIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2028] text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-zinc-500 font-mono">
                      SYNCHRONIZING LEDGER STATE...
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-zinc-500 font-mono">
                      {search || stockFilter !== 'ALL'
                        ? 'NO CATALOG ITEMS MATCH FILTER CRITERIA'
                        : 'NO LEDGER MUTATIONS RECORDED AT THIS FACILITY'}
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item: any) => {
                    const rp = item.reorderPoint ?? 10;
                    const isLow = item.balance <= rp && item.balance > 0;
                    const isEmpty = item.balance === 0;
                    const val = item.valuation ?? ((item.balance || 0) * (item.costPrice || 0));
                    return (
                      <tr key={item.productId} className="hover:bg-[#13161C] transition-colors industrial-row">
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-amber-400 font-bold bg-[#171A21] px-2 py-0.5 rounded border border-[#2B313E]">
                            {item.sku}
                          </code>
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-100">{item.name}</td>
                        <td className="px-4 py-3 text-zinc-500 font-mono">{item.unit}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-400">
                          {rp}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span
                            className={`text-base font-extrabold ${
                              isEmpty ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {item.balance}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">
                          ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          {isEmpty ? (
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-rose-950/40 text-rose-300 border border-rose-800/60 rounded uppercase">
                              DEPLETED
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-950/40 text-amber-300 border border-amber-800/60 rounded uppercase">
                              REORDER_RISK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 rounded uppercase">
                              OPTIMAL
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">
                          {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 font-mono text-[10px]">
                            <button
                              onClick={() => handleQuickAdjust(item)}
                              title="Record stock ledger adjustment"
                              className="px-2 py-1 bg-[#161921] hover:bg-[#1E232E] hover:border-amber-500/40 text-amber-400 border border-[#272D3A] rounded transition-colors"
                            >
                              ADJUST
                            </button>
                            <button
                              onClick={() => handleQuickTransfer(item)}
                              title="Transfer to another facility"
                              className="px-2 py-1 bg-[#161921] hover:bg-[#1E232E] text-zinc-300 border border-[#272D3A] rounded transition-colors"
                            >
                              MOVE
                            </button>
                            <button
                              onClick={() =>
                                setHistoryProduct({
                                  productId: item.productId,
                                  name: item.name,
                                  sku: item.sku,
                                })
                              }
                              title="Inspect immutable ledger audit stream"
                              className="px-2 py-1 bg-[#161921] hover:bg-[#1E232E] text-zinc-400 hover:text-zinc-200 border border-[#272D3A] rounded transition-colors"
                            >
                              AUDIT
                            </button>
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
      ) : (
        <div className="bg-[#0E1014] rounded-xl border border-dashed border-[#262B35] p-12 text-center text-zinc-500 font-mono text-xs">
          [!] SELECT FACILITY FROM SELECTOR DROPDOWN TO STREAM REAL-TIME LEDGER
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0E1014] border border-[#2B303C] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 text-zinc-100">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase">
                Stock Ledger Adjustment
              </h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-zinc-400 hover:text-zinc-100 font-mono text-xs"
              >
                [ESC]
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                  CATALOG_PRODUCT*
                </label>
                <select
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                  required
                >
                  <option value="">Choose item...</option>
                  {products?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                  FACILITY_LOCATION*
                </label>
                <select
                  value={adjustForm.warehouseId || warehouseId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                  required
                >
                  <option value="">Select facility...</option>
                  {warehouses?.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              {adjustmentBins && adjustmentBins.length > 0 && (
                <div>
                  <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                    BIN_SLOT (OPTIONAL)
                  </label>
                  <select
                    value={adjustForm.binId}
                    onChange={(e) => setAdjustForm({ ...adjustForm, binId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none font-mono text-xs"
                  >
                    <option value="">No specific bin slot</option>
                    {adjustmentBins.map((bin) => (
                      <option key={bin._id} value={bin._id}>
                        {bin.code} {bin.zone ? `[ZONE: ${bin.zone}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                    DIRECTION*
                  </label>
                  <select
                    value={adjustForm.type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none font-mono text-xs"
                  >
                    <option value="increase">[+] Increase Stock</option>
                    <option value="decrease">[-] Decrease Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                    DELTA_QUANTITY*
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                  AUDIT_REASON // NOTES*
                </label>
                <input
                  type="text"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g. Discrepancy during cycle count, Damaged packaging"
                  className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500 outline-none text-xs"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-2 border border-[#262B35] text-zinc-400 hover:text-zinc-100 hover:bg-[#161922] font-mono font-medium rounded-lg transition-colors text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-lg transition-colors disabled:opacity-50 text-xs font-mono btn-tactile"
                >
                  {adjustMutation.isPending ? 'COMMITTING...' : 'COMMIT_ADJUSTMENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Stock Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0E1014] border border-[#2B303C] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 text-zinc-100">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase">
                Inter-Facility Stock Transfer
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-zinc-400 hover:text-zinc-100 font-mono text-xs"
              >
                [ESC]
              </button>
            </div>
            <form onSubmit={handleTransferSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                  TRANSFER_SKU*
                </label>
                <select
                  value={transferForm.productId}
                  onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                  required
                >
                  <option value="">Select SKU...</option>
                  {products?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                  ORIGIN_WAREHOUSE*
                </label>
                <select
                  value={transferForm.fromWarehouseId || warehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                  required
                >
                  <option value="">Select origin facility...</option>
                  {warehouses?.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                  DESTINATION_WAREHOUSE*
                </label>
                <select
                  value={transferForm.toWarehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                  required
                >
                  <option value="">Select destination facility...</option>
                  {warehouses
                    ?.filter((wh) => wh._id !== (transferForm.fromWarehouseId || warehouseId))
                    .map((wh) => (
                      <option key={wh._id} value={wh._id}>
                        {wh.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                  TRANSFER_QUANTITY*
                </label>
                <input
                  type="number"
                  min="1"
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 focus:border-amber-500 outline-none text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-400 mb-1">
                  LOGISTICS_NOTES (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  placeholder="e.g. Rebalance inventory for regional fulfillment demand"
                  className="w-full px-3 py-2 bg-[#12141A] border border-[#262B35] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500 outline-none text-xs"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2 border border-[#262B35] text-zinc-400 hover:text-zinc-100 hover:bg-[#161922] font-mono font-medium rounded-lg transition-colors text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={transferMutation.isPending}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-lg transition-colors disabled:opacity-50 text-xs font-mono btn-tactile"
                >
                  {transferMutation.isPending ? 'TRANSFERRING...' : 'DISPATCH_TRANSFER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Audit Drawer */}
      {historyProduct && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0E1014] border border-[#2B303C] rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col text-zinc-100">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase">
                  Stock Ledger Audit Trail
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {historyProduct.name} (<span className="font-mono text-amber-400">{historyProduct.sku}</span>)
                </p>
              </div>
              <button
                onClick={() => setHistoryProduct(null)}
                className="text-zinc-400 hover:text-zinc-100 font-mono text-xs"
              >
                [ESC]
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-[#1C2028]">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                  QUERYING IMMUTABLE AUDIT RECORDS...
                </div>
              ) : !stockHistory || stockHistory.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                  NO AUDIT MUTATIONS FOUND FOR THIS SKU AT THIS FACILITY
                </div>
              ) : (
                stockHistory.map((entry: any) => (
                  <div key={entry._id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] uppercase border ${
                            entry.quantityChange > 0
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                              : 'bg-rose-950/40 text-rose-400 border-rose-500/40'
                          }`}
                        >
                          {entry.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          REF: {entry.referenceType}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-1">
                        By {entry.createdBy?.name || 'Staff User'} • {new Date(entry.createdAt).toLocaleString()}
                        {entry.batchNumber && ` • Batch #${entry.batchNumber}`}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div
                        className={`text-sm font-bold ${
                          entry.quantityChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {entry.quantityChange > 0 ? `+${entry.quantityChange}` : entry.quantityChange}
                      </div>
                      <div className="text-[10px] text-zinc-500">Balance: {entry.balanceAfter}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#232730] text-right">
              <button
                onClick={() => setHistoryProduct(null)}
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
