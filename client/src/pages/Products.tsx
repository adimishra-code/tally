import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Product } from '../types';
import { IconExport, IconImport } from '../components/Icons';

export default function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    unit: 'pcs',
    reorderPoint: 10,
    reorderQty: 50,
    costPrice: 0,
    sellPrice: 0,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeFilter) params.append('isActive', activeFilter);
      const { data } = await api.get<Product[]>(`/products?${params.toString()}`);
      return data;
    },
  });

  // Telemetry metrics
  const totalProducts = products?.length || 0;
  const activeProducts = products?.filter((p) => p.isActive).length || 0;
  const reorderThresholdsCount = products?.filter((p) => p.reorderPoint > 0).length || 0;
  const avgMargin = products && products.length > 0
    ? (products.reduce((acc, p) => acc + ((p.sellPrice - p.costPrice) / (p.sellPrice || 1)) * 100, 0) / products.length).toFixed(1)
    : '0.0';

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product SKU registered successfully');
      setShowCreateForm(false);
      setFormData({
        sku: '',
        name: '',
        description: '',
        unit: 'pcs',
        reorderPoint: 10,
        reorderQty: 50,
        costPrice: 0,
        sellPrice: 0,
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      api.patch(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product specs updated');
      setEditingProduct(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update product');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/toggle-active`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(res.data.message || 'Product status toggled');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to toggle status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deactivated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to deactivate product');
    },
  });

  const importMutation = useMutation({
    mutationFn: (items: any[]) => api.post('/products/import/csv', items),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(res.data.message || 'CSV catalog imported successfully');
      setShowImportModal(false);
      setImportCsvText('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to import CSV');
    },
  });

  const handleExportCsv = async () => {
    try {
      const response = await api.get('/products/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tally_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Product catalog exported');
    } catch {
      toast.error('Failed to export products');
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCsvText.trim()) return;

    try {
      const lines = importCsvText.trim().split('\n').filter(Boolean);
      if (lines.length < 2) {
        toast.error('CSV requires a header row and at least one SKU record');
        return;
      }

      const items = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        return {
          sku: cols[0] || 'SKU-NEW',
          name: cols[1] || 'Product',
          description: cols[2] || '',
          unit: cols[3] || 'pcs',
          costPrice: parseFloat(cols[4]) || 0,
          sellPrice: parseFloat(cols[5]) || 0,
          reorderPoint: parseInt(cols[6]) || 0,
          reorderQty: parseInt(cols[7]) || 0,
        };
      });

      importMutation.mutate(items);
    } catch {
      toast.error('Malformed CSV data. Inspect row format.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImportCsvText((event.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500/90 font-semibold">Catalog Registry // Master SKUs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">Item Master & Specifications</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">Define SKUs, procurement thresholds, units of measure, and commercial pricing</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-[#0E1014] border border-[#232730] hover:border-zinc-600 text-zinc-300 hover:text-white font-medium rounded-lg transition-all text-xs flex items-center gap-1.5"
          >
            <IconExport className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-[#0E1014] border border-[#232730] hover:border-zinc-600 text-zinc-300 hover:text-white font-medium rounded-lg transition-all text-xs flex items-center gap-1.5"
          >
            <IconImport className="w-3.5 h-3.5 text-zinc-400" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-all shadow-md shadow-amber-500/10 text-xs flex items-center gap-1.5"
          >
            <span>{showCreateForm ? 'Close Editor' : '+ Register SKU'}</span>
          </button>
        </div>
      </div>

      {/* Telemetry KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Catalog Population</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{totalProducts}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Registered SKUs in master index</div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Active Status</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{activeProducts}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Available for order allocation</div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Safety Policies</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{reorderThresholdsCount}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">SKUs with automated min targets</div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Gross Avg Margin</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{avgMargin}%</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Catalog commercial spread</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-mono">QRY://</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU code, product title, specifications..."
            className="w-full pl-16 pr-4 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full md:w-44 px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-300 focus:border-amber-500/50 outline-none text-xs font-mono"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive / Deprecated</option>
          </select>
        </div>
      </div>

      {/* Create Product Form */}
      {showCreateForm && (
        <div className="bg-[#0E1014] border border-amber-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#232730] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">New Product Registration</h3>
            </div>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-xs text-zinc-400 hover:text-white font-mono"
            >
              [ESC / CANCEL]
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(formData);
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">SKU Identifier *</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. SKU-HD-9020"
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none font-mono uppercase text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Item Title *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Heavy Duty Conveyor Roller"
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Unit of Measure *</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none text-xs font-mono"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="box">Carton Box (box)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="pallet">Wooden Pallet (pallet)</option>
                <option value="liters">Liters (L)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Reorder Point (Min)</label>
              <input
                type="number"
                min="0"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Standard Reorder Batch</label>
              <input
                type="number"
                min="0"
                value={formData.reorderQty}
                onChange={(e) => setFormData({ ...formData, reorderQty: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Cost Price ($ USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none font-mono text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Sell Price ($ USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.sellPrice}
                onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none font-mono text-xs"
                required
              />
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Technical Notes</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Dimensions, grade, supplier remarks..."
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 outline-none text-xs"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2 border-t border-[#232730]">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3.5 py-1.5 border border-[#232730] text-zinc-400 hover:text-white rounded-lg text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all disabled:opacity-50"
              >
                {createMutation.isPending ? 'Committing...' : 'Commit SKU to Registry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Catalog Table */}
      <div className="bg-[#0E1014] border border-[#232730] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#232730] bg-[#090A0C]/80 text-[11px] font-mono uppercase text-zinc-500 tracking-wider">
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Item Specifications</th>
                <th className="py-3 px-4">UoM</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">List Price</th>
                <th className="py-3 px-4 text-right">Margin</th>
                <th className="py-3 px-4 text-center">Safety / Batch</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1E26] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Scanning catalog database...
                  </td>
                </tr>
              ) : !products || products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    No SKU records match the specified query parameters.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const marginPct = product.sellPrice > 0
                    ? (((product.sellPrice - product.costPrice) / product.sellPrice) * 100).toFixed(1)
                    : '0.0';

                  return (
                    <tr key={product._id} className="hover:bg-[#12141A] transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-xs tracking-tight">
                            {product.sku}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-white group-hover:text-amber-200 transition-colors">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-[11px] text-zinc-500 truncate max-w-sm mt-0.5">
                            {product.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-zinc-400 text-xs">
                        {product.unit}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-zinc-300">
                        ${product.costPrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                        ${product.sellPrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-xs">
                        <span className={Number(marginPct) >= 30 ? 'text-emerald-400' : 'text-zinc-400'}>
                          {marginPct}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-xs text-zinc-400">
                        <span className="text-white font-semibold">{product.reorderPoint}</span>
                        <span className="text-zinc-600 mx-1">/</span>
                        <span className="text-zinc-400">+{product.reorderQty}</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleActiveMutation.mutate(product._id)}
                          className={`px-2.5 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                            product.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-zinc-800/80 text-zinc-500 border-zinc-700 hover:bg-zinc-700/80'
                          }`}
                          title="Toggle active catalog availability"
                        >
                          {product.isActive ? 'ACTIVE' : 'DEPRECATED'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="px-2.5 py-1 text-xs font-mono bg-[#181B22] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-[#282D37] rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Deactivate SKU "${product.sku}" (${product.name})?`)) {
                                deleteMutation.mutate(product._id);
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-mono bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded transition-colors"
                          >
                            Deactivate
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

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1014] border border-[#232730] rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-500">Edit SKU Specification</span>
                <h3 className="text-base font-bold text-white font-mono">{editingProduct.sku}</h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-zinc-500 hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editingProduct._id,
                  data: {
                    name: editingProduct.name,
                    description: editingProduct.description,
                    unit: editingProduct.unit,
                    costPrice: editingProduct.costPrice,
                    sellPrice: editingProduct.sellPrice,
                    reorderPoint: editingProduct.reorderPoint,
                    reorderQty: editingProduct.reorderQty,
                  },
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Item Title *</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Description / Spec</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 outline-none text-xs"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Unit of Measure</label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none text-xs font-mono"
                  >
                    <option value="pcs">Pieces</option>
                    <option value="box">Carton Box</option>
                    <option value="kg">Kilograms</option>
                    <option value="pallet">Pallet</option>
                    <option value="liters">Liters</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Cost Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.costPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Sell Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.sellPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Min Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.reorderPoint}
                    onChange={(e) => setEditingProduct({ ...editingProduct, reorderPoint: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Reorder Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.reorderQty}
                    onChange={(e) => setEditingProduct({ ...editingProduct, reorderQty: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 focus:border-amber-500/50 outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#232730]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2 border border-[#232730] text-zinc-400 hover:text-white rounded-lg text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Update SKU Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1014] border border-[#232730] rounded-xl shadow-2xl max-w-xl w-full p-5 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-500">Bulk Ingestion</span>
                <h3 className="text-base font-bold text-white font-mono">Import Products via CSV</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-zinc-500 hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Select .csv File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-[#282D37] file:text-xs file:font-mono file:bg-[#181B22] file:text-zinc-200 hover:file:bg-[#20242E] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Or Paste CSV Records (Header: SKU,Name,Description,Unit,CostPrice,SellPrice,ReorderPoint,ReorderQty)
                </label>
                <textarea
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder="SKU,Name,Description,Unit,CostPrice,SellPrice,ReorderPoint,ReorderQty&#10;SKU-101,Widget A,Standard widget,pcs,10.50,19.99,10,50"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 placeholder-zinc-700 focus:border-amber-500/50 outline-none"
                  rows={6}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#232730]">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2 border border-[#232730] text-zinc-400 hover:text-white rounded-lg text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importMutation.isPending}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all disabled:opacity-50"
                >
                  {importMutation.isPending ? 'Ingesting...' : 'Execute CSV Ingestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
