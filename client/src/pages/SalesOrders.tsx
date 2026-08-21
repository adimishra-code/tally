import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function SalesOrders() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    warehouseId: '',
    lines: [{ productId: '', orderedQty: 1 }],
  });

  const { data: sos, isLoading } = useQuery({
    queryKey: ['sales-orders', statusFilter],
    queryFn: async () => {
      const { data } = await api.get(`/sales-orders${statusFilter ? `?status=${statusFilter}` : ''}`);
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
        return 'bg-gray-100 text-gray-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'PICKING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PACKED':
        return 'bg-purple-100 text-purple-800';
      case 'PARTIALLY_SHIPPED':
        return 'bg-orange-100 text-orange-800';
      case 'SHIPPED':
        return 'bg-green-100 text-green-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextActions = (status: string) => {
    const actions: Record<string, string[]> = {
      DRAFT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PICKING', 'CANCELLED'],
      PICKING: ['PACKED', 'CANCELLED'],
      PACKED: ['PARTIALLY_SHIPPED', 'SHIPPED'],
      PARTIALLY_SHIPPED: ['SHIPPED'],
      SHIPPED: ['DELIVERED'],
    };
    return actions[status] || [];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sales Orders</h2>
          <p className="text-gray-600">Manage outbound fulfillment</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Sales Order'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PICKING">Picking</option>
          <option value="PACKED">Packed</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Sales Order</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name*</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse*</label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                <label className="block text-sm font-medium text-gray-700">Line Items*</label>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                    {formData.lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Sales Order'}
            </button>
          </form>
        </div>
      )}

      {/* SO List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading sales orders...</div>
        ) : !sos || sos.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No sales orders found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sos.map((so: any) => (
              <div key={so._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{so.orderNumber}</h3>
                      <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${getStatusColor(so.status)}`}>
                        {so.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Customer: <span className="font-medium">{so.customerName}</span> • Created:{' '}
                      {new Date(so.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">{so.lines.length} items</div>
                  </div>
                </div>

                {/* Lines Preview */}
                <div className="mb-3 text-sm text-gray-600">
                  {so.lines.slice(0, 2).map((line: any, idx: number) => (
                    <div key={idx}>
                      • {line.orderedQty} × {line.productId?.name || 'Product'}
                      {line.pickedQty > 0 && ` (${line.pickedQty} picked)`}
                      {line.shippedQty > 0 && ` (${line.shippedQty} shipped)`}
                    </div>
                  ))}
                  {so.lines.length > 2 && <div className="text-gray-500">+ {so.lines.length - 2} more...</div>}
                </div>

                {/* Actions */}
                {getNextActions(so.status).length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {getNextActions(so.status).map((action) => (
                      <button
                        key={action}
                        onClick={() => transitionMutation.mutate({ id: so._id, nextStatus: action })}
                        disabled={transitionMutation.isPending}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {action.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
