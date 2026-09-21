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
      toast.success('Warehouse facility provisioned');
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
      toast.success('Warehouse facility updated');
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
      toast.success('Warehouse facility decommissioned');
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
      toast.success('Bin location mapped');
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
      toast.success('Bin location removed');
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
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500/90 font-semibold">Facilities // Site Topology</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">Warehouse Facilities & Bins</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">Manage distribution centers, physical zones, and granular aisle/rack coordinates</p>
        </div>

        <button
          onClick={() => setShowAddWarehouse(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-all shadow-md shadow-amber-500/10 text-xs font-mono flex items-center gap-1.5 self-start md:self-auto"
        >
          <span>+ Provision Facility</span>
        </button>
      </div>

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total Sites</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{totalWarehouses}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Registered network nodes</div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Operational Sites</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{activeCount}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Active fulfillment hubs</div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Decommissioned</div>
          <div className="text-2xl font-bold font-mono text-zinc-500 mt-1">{inactiveCount}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Offline or staging facilities</div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Active Focus Bins</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {selectedWarehouse ? bins?.length ?? 0 : '0'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
            {selectedWarehouse ? selectedWarehouse.name : 'Select facility below'}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-mono">SITE://</span>
          <input
            type="text"
            placeholder="Search facility name, street address, or dock identifier..."
            value={warehouseSearch}
            onChange={(e) => setWarehouseSearch(e.target.value)}
            className="w-full pl-16 pr-4 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 outline-none text-xs font-mono"
          />
        </div>

        <div className="flex items-center bg-[#090A0C] p-1 rounded-lg border border-[#232730] text-xs font-mono w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded transition-colors ${
              statusFilter === 'ALL' ? 'bg-[#181B22] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({totalWarehouses})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1 rounded transition-colors ${
              statusFilter === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1 rounded transition-colors ${
              statusFilter === 'INACTIVE' ? 'bg-[#181B22] text-zinc-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-zinc-500 font-mono text-xs">Loading facility network...</div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="col-span-full bg-[#0E1014] rounded-xl border border-[#232730] p-12 text-center text-zinc-400 font-mono text-xs">
            {warehouseSearch || statusFilter !== 'ALL'
              ? 'No warehouse facilities match the filter parameters.'
              : 'No facilities configured. Click "+ Provision Facility" to initiate setup.'}
          </div>
        ) : (
          filteredWarehouses.map((wh) => {
            const isSelected = selectedWarehouse?._id === wh._id;
            return (
              <div
                key={wh._id}
                onClick={() => setSelectedWarehouse(wh)}
                className={`rounded-xl border transition-all cursor-pointer p-4 relative ${
                  isSelected
                    ? 'bg-[#12141A] border-amber-500/80 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                    : 'bg-[#0E1014] border-[#232730] hover:border-zinc-600 hover:bg-[#12141A]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <IconBuilding className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm font-mono tracking-tight">{wh.name}</h3>
                      <span
                        className={`inline-block px-1.5 py-0.2 text-[10px] font-mono rounded border uppercase mt-0.5 ${
                          wh.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                        }`}
                      >
                        {wh.isActive ? 'ACTIVE' : 'OFFLINE'}
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
                      className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors text-xs font-mono"
                      title="Edit Facility Parameters"
                    >
                      [EDIT]
                    </button>
                    {wh.isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Decommission facility ${wh.name}?`)) {
                            deleteWarehouseMutation.mutate(wh._id);
                          }
                        }}
                        className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10 transition-colors text-xs font-mono"
                        title="Decommission Facility"
                      >
                        [OFFLINE]
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mb-3 min-h-[2rem]">
                  {wh.address || 'No physical address designated'}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-[#1F232B] text-xs font-mono">
                  <span className="text-zinc-500">Coordinate Bins</span>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                    {isSelected ? `${bins?.length ?? 0} mapped` : 'Click to inspect'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Warehouse Bin Location Explorer */}
      {selectedWarehouse && (
        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#232730] pb-3 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                  Topological Bins // {selectedWarehouse.name}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Physical rack, shelf, and floor zone partitioning for directed picking and storage
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-44">
                <span className="absolute left-2.5 top-2 text-zinc-500 text-xs font-mono">BIN:</span>
                <input
                  type="text"
                  placeholder="Filter bins..."
                  value={binSearch}
                  onChange={(e) => setBinSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-1.5 bg-[#090A0C] border border-[#232730] rounded-lg text-xs font-mono text-white placeholder-zinc-600 outline-none focus:border-amber-500/50"
                />
              </div>
              <button
                onClick={() => setShowAddBin(true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold font-mono rounded-lg transition-all shadow-md shadow-amber-500/10 whitespace-nowrap"
              >
                + Add Bin
              </button>
            </div>
          </div>

          {isLoadingBins ? (
            <div className="py-8 text-center text-zinc-500 font-mono text-xs">Scanning storage grid...</div>
          ) : filteredBins.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 font-mono text-xs bg-[#090A0C] rounded-lg border border-[#232730]">
              {binSearch ? 'No bin coordinates match query.' : 'No storage bins defined in this warehouse.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {filteredBins.map((bin) => (
                <div
                  key={bin._id}
                  className="bg-[#090A0C] border border-[#232730] rounded-lg p-2.5 flex flex-col justify-between hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono font-bold text-amber-400 text-xs">{bin.code}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Remove bin location ${bin.code}?`)) {
                          deleteBinMutation.mutate(bin._id);
                        }
                      }}
                      className="text-zinc-600 hover:text-rose-400 text-xs transition-colors font-mono"
                      title="Delete Bin"
                    >
                      ✕
                    </button>
                  </div>
                  {bin.zone && (
                    <span className="text-[10px] text-zinc-400 mt-2 bg-[#12141A] px-1.5 py-0.5 rounded border border-[#232730] font-mono truncate">
                      {bin.zone}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1014] border border-[#232730] rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-500">Site Provisioning</span>
                <h3 className="text-base font-bold text-white font-mono">Provision Warehouse Facility</h3>
              </div>
              <button
                onClick={() => setShowAddWarehouse(false)}
                className="text-zinc-500 hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Facility Name *</label>
                <input
                  type="text"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="e.g. Central Logistics Node 01"
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs focus:border-amber-500/50 outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Physical Address / Bay Coordinates</label>
                <textarea
                  value={warehouseForm.address}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                  placeholder="e.g. 500 Industrial Pkwy, Dock 12-B"
                  rows={2}
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs placeholder-zinc-600 focus:border-amber-500/50 outline-none font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2 border-t border-[#232730]">
                <button
                  type="button"
                  onClick={() => setShowAddWarehouse(false)}
                  className="flex-1 py-2 border border-[#232730] text-zinc-400 hover:text-white rounded-lg text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWarehouseMutation.isPending}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all disabled:opacity-50"
                >
                  {createWarehouseMutation.isPending ? 'Provisioning...' : 'Provision Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Warehouse Modal */}
      {editingWarehouse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1014] border border-[#232730] rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-500">Configuration</span>
                <h3 className="text-base font-bold text-white font-mono">Edit Facility Parameters</h3>
              </div>
              <button
                onClick={() => setEditingWarehouse(null)}
                className="text-zinc-500 hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateWarehouse} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Facility Name *</label>
                <input
                  type="text"
                  value={editWarehouseForm.name}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs focus:border-amber-500/50 outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Address / Dock Details</label>
                <textarea
                  value={editWarehouseForm.address}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs focus:border-amber-500/50 outline-none font-mono"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="warehouseActiveToggle"
                  checked={editWarehouseForm.isActive}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, isActive: e.target.checked })}
                  className="rounded border-[#232730] bg-[#090A0C] text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="warehouseActiveToggle" className="text-xs font-mono text-zinc-300">
                  Facility Operational (Active)
                </label>
              </div>
              <div className="flex gap-2 pt-2 border-t border-[#232730]">
                <button
                  type="button"
                  onClick={() => setEditingWarehouse(null)}
                  className="flex-1 py-2 border border-[#232730] text-zinc-400 hover:text-white rounded-lg text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateWarehouseMutation.isPending}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all disabled:opacity-50"
                >
                  {updateWarehouseMutation.isPending ? 'Saving...' : 'Commit Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bin Modal */}
      {showAddBin && selectedWarehouse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1014] border border-[#232730] rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-500">Rack & Floor Mapping</span>
                <h3 className="text-base font-bold text-white font-mono">Add Bin Coordinate</h3>
              </div>
              <button
                onClick={() => setShowAddBin(false)}
                className="text-zinc-500 hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Bin Coordinate Identifier *</label>
                <input
                  type="text"
                  value={binForm.code}
                  onChange={(e) => setBinForm({ ...binForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. A-02-04"
                  className="w-full px-3 py-2 font-mono font-bold bg-[#090A0C] border border-[#232730] rounded-lg focus:border-amber-500/50 outline-none text-white text-xs"
                  required
                />
                <p className="text-[10px] font-mono text-zinc-500 mt-1">Recommended schema: Aisle-Rack-Shelf (e.g., A-01-02)</p>
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Zone Tag (Optional)</label>
                <input
                  type="text"
                  value={binForm.zone}
                  onChange={(e) => setBinForm({ ...binForm, zone: e.target.value })}
                  placeholder="e.g. Pallet Bulk, Fast Pick, Cold Lock"
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg focus:border-amber-500/50 outline-none text-white text-xs font-mono placeholder-zinc-600"
                />
              </div>
              <div className="flex gap-2 pt-2 border-t border-[#232730]">
                <button
                  type="button"
                  onClick={() => setShowAddBin(false)}
                  className="flex-1 py-2 border border-[#232730] text-zinc-400 hover:text-white rounded-lg text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBinMutation.isPending}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all disabled:opacity-50"
                >
                  {createBinMutation.isPending ? 'Mapping...' : 'Commit Coordinate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
