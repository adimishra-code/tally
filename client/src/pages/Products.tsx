import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Product } from '../types';

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

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
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
      toast.success('Product updated successfully');
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
      toast.success(res.data.message || 'Product status updated');
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
      toast.success(res.data.message || 'CSV imported successfully');
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
      link.setAttribute('download', `products_export_${new Date().toISOString().slice(0, 10)}.csv`);
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
        toast.error('CSV must have a header row and at least one data row');
        return;
      }

      // Parse CSV rows
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
      toast.error('Invalid CSV format. Please check structure');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImportCsvText(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Product Catalog</h2>
          <p className="text-gray-600">SKU definitions, reorder thresholds, and pricing</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm flex items-center gap-1.5"
          >
            <span>📥</span> Export CSV
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm flex items-center gap-1.5"
          >
            <span>📤</span> Import CSV
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
          >
            {showCreateForm ? 'Cancel' : '+ New Product'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-2.5 text-gray-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, product name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        >
          <option value="">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Create New Product</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(formData);
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">SKU*</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. SKU-PROD-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name*</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Industrial Steel Widget"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional product details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Unit of Measure*</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="box">Box (box)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="pallet">Pallet (pallet)</option>
                <option value="liters">Liters (L)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cost Price ($)*</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Sell Price ($)*</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.sellPrice}
                onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reorder Point</label>
              <input
                type="number"
                min="0"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reorder Qty</label>
              <input
                type="number"
                min="0"
                value={formData.reorderQty}
                onChange={(e) => setFormData({ ...formData, reorderQty: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {createMutation.isPending ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder (Min/Qty)</th>
                <th className="px-6 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Loading product catalog...
                  </td>
                </tr>
              ) : !products || products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No products found matching your filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono font-bold text-gray-900">{product.sku}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{product.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.unit}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                      ${product.costPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-blue-700 font-bold">
                      ${product.sellPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">
                      <span className="font-semibold text-gray-900">{product.reorderPoint}</span> / {product.reorderQty}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActiveMutation.mutate(product._id)}
                        className={`px-2.5 py-1 text-xs font-bold rounded uppercase transition-colors ${
                          product.isActive
                            ? 'bg-green-100 hover:bg-green-200 text-green-800'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        }`}
                        title="Click to toggle active status"
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Deactivate product "${product.name}"?`)) {
                              deleteMutation.mutate(product._id);
                            }
                          }}
                          className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded font-medium transition-colors"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                Edit Product: <span className="font-mono text-blue-600">{editingProduct.sku}</span>
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Name*</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit*</label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="pcs">Pieces</option>
                    <option value="box">Box</option>
                    <option value="kg">Kilograms</option>
                    <option value="pallet">Pallet</option>
                    <option value="liters">Liters</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cost Price ($)*</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.costPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sell Price ($)*</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.sellPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reorder Point</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.reorderPoint}
                    onChange={(e) => setEditingProduct({ ...editingProduct, reorderPoint: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reorder Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.reorderQty}
                    onChange={(e) => setEditingProduct({ ...editingProduct, reorderQty: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2 text-sm border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Bulk Import Products (CSV)</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Upload .csv File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Or Paste Raw CSV Data (Header required: SKU, Name, Description, Unit, CostPrice, SellPrice, ReorderPoint, ReorderQty)
                </label>
                <textarea
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder="SKU,Name,Description,Unit,CostPrice,SellPrice,ReorderPoint,ReorderQty&#10;SKU-101,Widget A,Standard widget,pcs,10.50,19.99,10,50"
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={6}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2 text-sm border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importMutation.isPending}
                  className="flex-1 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {importMutation.isPending ? 'Importing...' : 'Start Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
