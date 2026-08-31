import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Warehouse, Bin } from '../types';

export default function Warehouses() {
  const queryClient = useQueryClient();
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showAddBin, setShowAddBin] = useState(false);

  const [warehouseForm, setWarehouseForm] = useState({ name: '', address: '' });
  const [editWarehouseForm, setEditWarehouseForm] = useState({ name: '', address: '', isActive: true });
  const [binForm, setBinForm] = useState({ code: '', zone: '' });

  // Fetch warehouses
  const { data: warehouses, isLoading } = useQuery<Warehouse[]>({
    queryKey: ['warehouses', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/warehouses?includeInactive=true');
      return data;
    },
  });

  // Fetch bins for selected warehouse
  const { data: bins, isLoading: isLoadingBins } = useQuery<Bin[]>({
    queryKey: ['bins', selectedWarehouse?._id],
    queryFn: async () => {
      if (!selectedWarehouse) return [];
      const { data } = await api.get(`/bins/warehouse/${selectedWarehouse._id}`);
      return data;
    },
    enabled: !!selectedWarehouse,
  });

  // Mutations
  const createWarehouseMutation = useMutation({
    mutationFn: (data: typeof warehouseForm) => api.post('/warehouses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created successfully');
      setShowAddWarehouse(false);
      setWarehouseForm({ name: '', address: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create warehouse');
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editWarehouseForm }) =>
      api.patch(`/warehouses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse updated successfully');
      setEditingWarehouse(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update warehouse');
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to deactivate warehouse');
    },
  });

  const createBinMutation = useMutation({
    mutationFn: (data: { warehouseId: string; code: string; zone?: string }) => api.post('/bins', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins', selectedWarehouse?._id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Bin location added');
      setShowAddBin(false);
      setBinForm({ code: '', zone: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add bin');
    },
  });

  const deleteBinMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins', selectedWarehouse?._id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Bin deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete bin');
    },
  });

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    createWarehouseMutation.mutate(warehouseForm);
  };

  const handleUpdateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    updateWarehouseMutation.mutate({ id: editingWarehouse._id, data: editWarehouseForm });
  };

  const handleCreateBin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) return;
    createBinMutation.mutate({
      warehouseId: selectedWarehouse._id,
      code: binForm.code,
      zone: binForm.zone || undefined,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Warehouses & Bins</h2>
          <p className="text-gray-600">Manage physical facilities and specific storage locations</p>
        </div>
        <button
          onClick={() => setShowAddWarehouse(true)}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          + Add Warehouse
        </button>
      </div>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Loading warehouses...</div>
        ) : !warehouses || warehouses.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            No warehouses found. Click "+ Add Warehouse" to create one.
          </div>
        ) : (
          warehouses.map((wh) => {
            const isSelected = selectedWarehouse?._id === wh._id;
            return (
              <div
                key={wh._id}
                onClick={() => setSelectedWarehouse(wh)}
                className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer p-6 relative ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-100'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
                      🏢
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{wh.name}</h3>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-semibold rounded uppercase mt-0.5 ${
                          wh.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {wh.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingWarehouse(wh);
                        setEditWarehouseForm({
                          name: wh.name,
                          address: wh.address || '',
                          isActive: wh.isActive,
                        });
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-50"
                      title="Edit Warehouse"
                    >
                      ✏️
                    </button>
                    {wh.isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to deactivate ${wh.name}?`)) {
                            deleteWarehouseMutation.mutate(wh._id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-50"
                        title="Deactivate Warehouse"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 min-h-[2.5rem]">
                  {wh.address || 'No physical address configured'}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm">
                  <span className="text-gray-500 font-medium">Bin Locations</span>
                  <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full text-xs">
                    {isSelected ? bins?.length ?? '...' : 'Click to view'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Warehouse Bin Location Explorer */}
      {selectedWarehouse && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Bin Locations in <span className="text-blue-600">{selectedWarehouse.name}</span>
              </h3>
              <p className="text-sm text-gray-500">
                Organize inventory by aisle, rack, and shelf (e.g., A-01-02)
              </p>
            </div>
            <button
              onClick={() => setShowAddBin(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              + Add Bin Location
            </button>
          </div>

          {isLoadingBins ? (
            <div className="py-8 text-center text-gray-500">Loading bins...</div>
          ) : !bins || bins.length === 0 ? (
            <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg">
              No specific bins registered in this warehouse yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {bins.map((bin) => (
                <div
                  key={bin._id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col justify-between hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono font-bold text-gray-900 text-sm">{bin.code}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete bin location ${bin.code}?`)) {
                          deleteBinMutation.mutate(bin._id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 text-xs"
                      title="Delete Bin"
                    >
                      ✕
                    </button>
                  </div>
                  {bin.zone && (
                    <span className="text-xs text-gray-500 mt-2 bg-white px-1.5 py-0.5 rounded border border-gray-100 font-medium">
                      Zone: {bin.zone}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showAddWarehouse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">New Warehouse</h3>
              <button
                onClick={() => setShowAddWarehouse(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name*</label>
                <input
                  type="text"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="Main Distribution Center"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address / Location</label>
                <textarea
                  value={warehouseForm.address}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                  placeholder="100 Logistics Blvd, Dock 4"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWarehouse(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWarehouseMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createWarehouseMutation.isPending ? 'Saving...' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Warehouse Modal */}
      {editingWarehouse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Edit Warehouse</h3>
              <button
                onClick={() => setEditingWarehouse(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateWarehouse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name*</label>
                <input
                  type="text"
                  value={editWarehouseForm.name}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address / Location</label>
                <textarea
                  value={editWarehouseForm.address}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="warehouseActiveToggle"
                  checked={editWarehouseForm.isActive}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="warehouseActiveToggle" className="text-sm font-medium text-gray-700">
                  Warehouse Active
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWarehouse(null)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateWarehouseMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {updateWarehouseMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bin Modal */}
      {showAddBin && selectedWarehouse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add Bin Location</h3>
              <button
                onClick={() => setShowAddBin(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bin Code*</label>
                <input
                  type="text"
                  value={binForm.code}
                  onChange={(e) => setBinForm({ ...binForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. A-01-03"
                  className="w-full px-4 py-2 font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Suggested format: Aisle-Rack-Shelf</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone (Optional)</label>
                <input
                  type="text"
                  value={binForm.zone}
                  onChange={(e) => setBinForm({ ...binForm, zone: e.target.value })}
                  placeholder="e.g. Pallet Rack, Cold Storage, Fast Pick"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBin(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBinMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createBinMutation.isPending ? 'Saving...' : 'Add Bin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
