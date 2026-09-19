import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Warehouse, Bin } from '../types';
import { IconBuilding } from '../components/Icons';

export default function Warehouses() {
  const queryClient = useQueryClient();
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showAddBin, setShowAddBin] = useState(false);

  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [binSearch, setBinSearch] = useState('');

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

  const filteredWarehouses = (warehouses || []).filter((wh) => {
    if (warehouseSearch.trim()) {
      const q = warehouseSearch.toLowerCase();
      const matchesName = wh.name?.toLowerCase().includes(q);
      const matchesAddress = wh.address?.toLowerCase().includes(q);
      if (!matchesName && !matchesAddress) return false;
    }
    if (statusFilter === 'ACTIVE') return wh.isActive;
    if (statusFilter === 'INACTIVE') return !wh.isActive;
    return true;
  });

  const filteredBins = (bins || []).filter((b) => {
    if (!binSearch.trim()) return true;
    const q = binSearch.toLowerCase();
    return b.code?.toLowerCase().includes(q) || (b.zone && b.zone.toLowerCase().includes(q));
  });

  const totalWarehouses = warehouses?.length || 0;
  const activeCount = warehouses?.filter((w) => w.isActive).length || 0;
  const inactiveCount = warehouses?.filter((w) => !w.isActive).length || 0;

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <IconBuilding className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Warehouses & Bins</h2>
              <p className="text-xs sm:text-sm text-slate-400">Manage physical facilities, zones, and granular bin locations</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAddWarehouse(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <span>+</span>
          <span>Add Warehouse</span>
        </button>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Warehouses</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white">{totalWarehouses}</div>
          <div className="text-xs text-slate-500 mt-1">Configured facilities</div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Active Locations</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">{activeCount}</div>
          <div className="text-xs text-slate-500 mt-1">Operational facilities</div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Inactive Locations</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-400">{inactiveCount}</div>
          <div className="text-xs text-slate-500 mt-1">Decommissioned / draft</div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Selected Facility Bins</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400">
            {selectedWarehouse ? bins?.length ?? 0 : 'None'}
          </div>
          <div className="text-xs text-slate-400 mt-1 truncate">
            {selectedWarehouse ? selectedWarehouse.name : 'Click card below to select'}
          </div>
        </div>
      </div>

      {/* Warehouse Search & Status Filter */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search warehouses by name or address..."
            value={warehouseSearch}
            onChange={(e) => setWarehouseSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-sm text-white placeholder-slate-500"
          />
        </div>
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-medium w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({totalWarehouses})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'INACTIVE' ? 'bg-slate-800 text-slate-200 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-slate-500">Loading warehouses...</div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="col-span-full bg-slate-900/60 rounded-2xl border border-slate-800/80 p-12 text-center text-slate-400">
            {warehouseSearch || statusFilter !== 'ALL'
              ? 'No warehouses match the search or filter criteria.'
              : 'No warehouses found. Click "+ Add Warehouse" to create one.'}
          </div>
        ) : (
          filteredWarehouses.map((wh) => {
            const isSelected = selectedWarehouse?._id === wh._id;
            return (
              <div
                key={wh._id}
                onClick={() => setSelectedWarehouse(wh)}
                className={`rounded-2xl border transition-all cursor-pointer p-6 relative ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500/80 ring-2 ring-cyan-500/20 shadow-xl shadow-cyan-500/10'
                    : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                      <IconBuilding className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base sm:text-lg">{wh.name}</h3>
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase mt-0.5 border ${
                          wh.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
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
                      className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800/80 transition-colors"
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
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/80 transition-colors"
                        title="Deactivate Warehouse"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-4 min-h-[2.5rem]">
                  {wh.address || 'No physical address configured'}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-medium">Bin Locations</span>
                  <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold px-2.5 py-0.5 rounded-full">
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
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Bin Locations in <span className="text-cyan-400">{selectedWarehouse.name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Organize inventory by aisle, rack, and shelf (e.g., A-01-02)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-44">
                <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Filter bins..."
                  value={binSearch}
                  onChange={(e) => setBinSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                />
              </div>
              <button
                onClick={() => setShowAddBin(true)}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-cyan-500/20 whitespace-nowrap"
              >
                + Add Bin
              </button>
            </div>
          </div>

          {isLoadingBins ? (
            <div className="py-8 text-center text-slate-500">Loading bins...</div>
          ) : filteredBins.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800/80">
              {binSearch ? 'No bins match your filter.' : 'No specific bins registered in this warehouse yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredBins.map((bin) => (
                <div
                  key={bin._id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono font-bold text-white text-sm">{bin.code}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete bin location ${bin.code}?`)) {
                          deleteBinMutation.mutate(bin._id);
                        }
                      }}
                      className="text-slate-500 hover:text-rose-400 text-xs transition-colors"
                      title="Delete Bin"
                    >
                      ✕
                    </button>
                  </div>
                  {bin.zone && (
                    <span className="text-[11px] text-slate-400 mt-2 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono">
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white">New Warehouse</h3>
              <button
                onClick={() => setShowAddWarehouse(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Warehouse Name*</label>
                <input
                  type="text"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="Main Distribution Center"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address / Location</label>
                <textarea
                  value={warehouseForm.address}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                  placeholder="100 Logistics Blvd, Dock 4"
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm placeholder-slate-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWarehouse(false)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800/80 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWarehouseMutation.isPending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 text-sm"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white">Edit Warehouse</h3>
              <button
                onClick={() => setEditingWarehouse(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateWarehouse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Warehouse Name*</label>
                <input
                  type="text"
                  value={editWarehouseForm.name}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address / Location</label>
                <textarea
                  value={editWarehouseForm.address}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="warehouseActiveToggle"
                  checked={editWarehouseForm.isActive}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, isActive: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                />
                <label htmlFor="warehouseActiveToggle" className="text-xs font-medium text-slate-300">
                  Warehouse Active
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWarehouse(null)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800/80 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateWarehouseMutation.isPending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 text-sm"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white">Add Bin Location</h3>
              <button
                onClick={() => setShowAddBin(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bin Code*</label>
                <input
                  type="text"
                  value={binForm.code}
                  onChange={(e) => setBinForm({ ...binForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. A-01-03"
                  className="w-full px-4 py-2 font-mono font-bold bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Suggested format: Aisle-Rack-Shelf</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Zone (Optional)</label>
                <input
                  type="text"
                  value={binForm.zone}
                  onChange={(e) => setBinForm({ ...binForm, zone: e.target.value })}
                  placeholder="e.g. Pallet Rack, Cold Storage, Fast Pick"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm placeholder-slate-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBin(false)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800/80 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBinMutation.isPending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 text-sm"
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
