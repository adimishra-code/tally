import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Warehouse, Product, Bin } from '../types';

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

  // Fetch bins for adjustment modal if a warehouse is chosen in modal
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

      if (stockFilter === 'IN_STOCK') return item.balance > 10;
      if (stockFilter === 'LOW') return item.balance > 0 && item.balance <= 10;
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
  const lowStockCount = inventory?.filter((item: any) => item.balance > 0 && item.balance <= 10).length || 0;
  const outOfStockCount = inventory?.filter((item: any) => item.balance === 0).length || 0;

  // Export CSV
  const handleExportCsv = () => {
    if (!inventory || inventory.length === 0) {
      toast.error('No inventory records to export');
      return;
    }

    const selectedWh = warehouses?.find((w) => w._id === warehouseId);
    const whName = selectedWh ? selectedWh.name.replace(/\s+/g, '_') : 'warehouse';

    const headers = ['SKU', 'Product Name', 'Unit', 'Balance', 'Status', 'Last Mutation'];
    const rows = filteredInventory.map((item: any) => {
      const status = item.balance === 0 ? 'Out of Stock' : item.balance <= 10 ? 'Low Stock' : 'In Stock';
      return [
        `"${item.sku || ''}"`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${item.unit || ''}"`,
        item.balance ?? 0,
        `"${status}"`,
        `"${item.lastUpdated ? new Date(item.lastUpdated).toISOString() : ''}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_${whName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Inventory report exported');
  };

  const handleQuickAdjust = (item: any) => {
    setAdjustForm({
      productId: item.productId,
      warehouseId: warehouseId,
      binId: '',
      type: 'increase',
      quantity: 1,
      reason: 'Cycle count check',
    });
    setShowAdjustModal(true);
  };

  const handleQuickTransfer = (item: any) => {
    setTransferForm({
      productId: item.productId,
      fromWarehouseId: warehouseId,
      toWarehouseId: '',
      quantity: 1,
      reason: 'Rebalance transfer',
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
      toast.success('Stock adjustment recorded');
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
      toast.success('Stock transferred successfully');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Inventory Ledger</h2>
          <p className="text-gray-600">Derived real-time stock balances across all locations</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {warehouseId && inventory && inventory.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm flex items-center gap-1.5"
            >
              <span>📥</span> Export CSV
            </button>
          )}
          <button
            onClick={() => {
              setTransferForm((prev) => ({ ...prev, fromWarehouseId: warehouseId }));
              setShowTransferModal(true);
            }}
            className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm"
          >
            ↔ Transfer Stock
          </button>
          <button
            onClick={() => {
              setAdjustForm((prev) => ({ ...prev, warehouseId: warehouseId }));
              setShowAdjustModal(true);
            }}
            className="px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
          >
            + Adjust Stock
          </button>
        </div>
      </div>

      {/* Warehouse Selector Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Warehouse Location</label>
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setSearch('');
              setStockFilter('ALL');
            }}
            className="w-full md:w-96 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
          >
            <option value="">Choose a warehouse to view stock...</option>
            {warehouses?.map((wh) => (
              <option key={wh._id} value={wh._id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>
        {warehouseId && (
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
            Real-time balance ledger synced
          </div>
        )}
      </div>

      {/* KPI Metrics Cards */}
      {warehouseId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Total SKUs</div>
            <div className="text-2xl font-bold text-gray-900">{totalSkus}</div>
            <div className="text-xs text-gray-400 mt-1">Catalog items tracked</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Total Units</div>
            <div className="text-2xl font-bold text-blue-600">{totalUnits.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">Available balance on-hand</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Low Stock</div>
            <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
            <div className="text-xs text-gray-400 mt-1">Stock ≤ 10 units</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Out of Stock</div>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <div className="text-xs text-gray-400 mt-1">Immediate reorder required</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {warehouseId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3.5 top-2.5 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by SKU or product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <div className="flex items-center bg-gray-100 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setStockFilter('ALL')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  stockFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({totalSkus})
              </button>
              <button
                onClick={() => setStockFilter('IN_STOCK')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  stockFilter === 'IN_STOCK' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                In Stock ({inventory ? inventory.filter((i: any) => i.balance > 10).length : 0})
              </button>
              <button
                onClick={() => setStockFilter('LOW')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  stockFilter === 'LOW' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Low ({lowStockCount})
              </button>
              <button
                onClick={() => setStockFilter('OUT')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  stockFilter === 'OUT' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Out ({outOfStockCount})
              </button>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-700"
            >
              <option value="balance_desc">Stock: High to Low</option>
              <option value="balance_asc">Stock: Low to High</option>
              <option value="sku">SKU (A-Z)</option>
              <option value="name">Product Name (A-Z)</option>
            </select>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      {warehouseId ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available Balance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Mutation
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quick Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Loading inventory...
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {search || stockFilter !== 'ALL'
                        ? 'No inventory items match the current filters.'
                        : 'No stock records found for this warehouse yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item: any) => {
                    const isLow = item.balance <= 10 && item.balance > 0;
                    const isEmpty = item.balance === 0;
                    return (
                      <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-sm font-mono text-gray-900 font-bold">{item.sku}</code>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.unit}</td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`text-lg font-bold ${
                              isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'
                            }`}
                          >
                            {item.balance}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isEmpty ? (
                            <span className="px-2.5 py-1 text-xs font-bold bg-red-100 text-red-800 rounded uppercase">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded uppercase">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-bold bg-green-100 text-green-800 rounded uppercase">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(item.lastUpdated).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleQuickAdjust(item)}
                              title="Adjust stock quantity"
                              className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded transition-colors"
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => handleQuickTransfer(item)}
                              title="Transfer to another warehouse"
                              className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded transition-colors"
                            >
                              Move
                            </button>
                            <button
                              onClick={() =>
                                setHistoryProduct({
                                  productId: item.productId,
                                  name: item.name,
                                  sku: item.sku,
                                })
                              }
                              title="Audit ledger transactions"
                              className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded transition-colors"
                            >
                              Audit
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
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          Please select a warehouse from the dropdown above to view stock ledger balances.
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Manual Stock Adjustment</h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product*</label>
                <select
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Select product...</option>
                  {products?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.sku} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse*</label>
                <select
                  value={adjustForm.warehouseId || warehouseId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Select warehouse...</option>
                  {warehouses?.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              {adjustmentBins && adjustmentBins.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bin Location (Optional)</label>
                  <select
                    value={adjustForm.binId}
                    onChange={(e) => setAdjustForm({ ...adjustForm, binId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  >
                    <option value="">No specific bin</option>
                    {adjustmentBins.map((bin) => (
                      <option key={bin._id} value={bin._id}>
                        {bin.code} {bin.zone ? `(${bin.zone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action*</label>
                  <select
                    value={adjustForm.type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    <option value="increase">+ Increase Stock</option>
                    <option value="decrease">- Decrease Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity*</label>
                  <input
                    type="number"
                    min="1"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes*</label>
                <input
                  type="text"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g. Cycle count discrepancy, Damaged box"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {adjustMutation.isPending ? 'Recording...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Stock Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Transfer Stock Between Warehouses</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product*</label>
                <select
                  value={transferForm.productId}
                  onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Select product to move...</option>
                  {products?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.sku} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Source Warehouse*</label>
                <select
                  value={transferForm.fromWarehouseId || warehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Select origin...</option>
                  {warehouses?.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Destination Warehouse*</label>
                <select
                  value={transferForm.toWarehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Select destination...</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Quantity*</label>
                <input
                  type="number"
                  min="1"
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Notes (Optional)</label>
                <input
                  type="text"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  placeholder="e.g. Rebalance inventory for regional demand"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {transferMutation.isPending ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Audit Drawer */}
      {historyProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Stock Ledger History</h3>
                <p className="text-sm text-gray-500">
                  {historyProduct.name} (<span className="font-mono">{historyProduct.sku}</span>)
                </p>
              </div>
              <button
                onClick={() => setHistoryProduct(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-gray-500">Loading ledger audit entries...</div>
              ) : !stockHistory || stockHistory.length === 0 ? (
                <div className="py-12 text-center text-gray-500">No ledger entries found.</div>
              ) : (
                stockHistory.map((entry: any) => (
                  <div key={entry._id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-xs uppercase ${
                            entry.quantityChange > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {entry.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">Ref: {entry.referenceType}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        By: {entry.createdBy?.name || 'Staff'} • {new Date(entry.createdAt).toLocaleString()}
                        {entry.batchNumber && ` • Batch: ${entry.batchNumber}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          entry.quantityChange > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {entry.quantityChange > 0 ? `+${entry.quantityChange}` : entry.quantityChange}
                      </div>
                      <div className="text-xs text-gray-500">Balance: {entry.balanceAfter}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 text-right">
              <button
                onClick={() => setHistoryProduct(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
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
