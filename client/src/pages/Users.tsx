import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { IconExport } from '../components/Icons';

export default function Users() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'WAREHOUSE_STAFF',
  });

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'WAREHOUSE_STAFF',
    isActive: true,
    password: '',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    },
  });

  const filteredUsers = (users || []).filter((user: any) => {
    if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
    if (statusFilter === 'ACTIVE' && !user.isActive) return false;
    if (statusFilter === 'INACTIVE' && user.isActive) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = user.name?.toLowerCase().includes(q);
      const matchEmail = user.email?.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    return true;
  });

  const totalUsers = users?.length || 0;
  const activeCount = users?.filter((u: any) => u.isActive).length || 0;
  const adminCount = users?.filter((u: any) => u.role === 'ADMIN' || u.role === 'OWNER').length || 0;
  const staffCount = users?.filter((u: any) => u.role === 'WAREHOUSE_STAFF').length || 0;

  const exportUsersCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await api.get(`/users/export/csv?${params.toString()}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tally_users_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('User roster exported');
    } catch {
      toast.error('Failed to export users');
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Personnel record created');
      setShowForm(false);
      setFormData({ name: '', email: '', password: '', role: 'WAREHOUSE_STAFF' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User parameters updated');
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User access revoked');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to deactivate user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const payload: any = {
      name: editFormData.name,
      role: editFormData.role,
      isActive: editFormData.isActive,
    };
    if (editFormData.password.trim()) {
      payload.password = editFormData.password.trim();
    }
    updateMutation.mutate({ id: editingUser._id, data: payload });
  };

  const startEdit = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      password: '',
    });
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      OWNER: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      ADMIN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      PROCUREMENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      WAREHOUSE_STAFF: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      FINANCE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      VIEWER: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    };
    return styles[role] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500/90 font-semibold">IAM // Access Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">Personnel & Access Rights</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">Manage operator credentials, operational staff, and RBAC security policies</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportUsersCSV}
            className="px-3.5 py-2 bg-[#0E1014] border border-[#232730] hover:border-zinc-600 text-zinc-300 hover:text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
          >
            <IconExport className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export Roster</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs font-mono rounded-lg transition-all shadow-md shadow-amber-500/10"
          >
            {showForm ? 'Cancel Provisioning' : '+ Provision User'}
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total Personnel</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{totalUsers}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Accounts on tenant record</div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Active Credentials</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{activeCount}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Authorized for terminal login</div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Administrative</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{adminCount}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Privileged policy managers</div>
        </div>

        <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Floor Operations</div>
          <div className="text-2xl font-bold font-mono text-yellow-400 mt-1">{staffCount}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Active warehouse handlers</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#0E1014] border border-[#232730] rounded-xl p-3 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-mono">USR://</span>
          <input
            type="text"
            placeholder="Search team member by legal name or operator email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-4 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-xs font-mono text-white placeholder-zinc-600 outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#090A0C] border border-[#232730] rounded-lg text-xs font-mono text-zinc-300 outline-none focus:border-amber-500/50"
          >
            <option value="ALL">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="PROCUREMENT">Procurement</option>
            <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
            <option value="FINANCE">Finance</option>
            <option value="VIEWER">Viewer</option>
          </select>

          <div className="flex items-center bg-[#090A0C] p-1 rounded-lg border border-[#232730] text-xs font-mono">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === 'ALL' ? 'bg-[#181B22] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({totalUsers})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === 'INACTIVE' ? 'bg-[#181B22] text-zinc-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Inactive ({totalUsers - activeCount})
            </button>
          </div>
        </div>
      </div>

      {/* Create User Form Drawer */}
      {showForm && (
        <div className="bg-[#0E1014] border border-amber-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#232730] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Provision Operator Account</h3>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs text-zinc-400 hover:text-white font-mono"
            >
              [CANCEL]
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Full Legal Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Marcus Vance"
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs focus:border-amber-500/50 outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Operator Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. m.vance@facility.internal"
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs focus:border-amber-500/50 outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Initial Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs focus:border-amber-500/50 outline-none font-mono"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Security Role Profile *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs font-mono focus:border-amber-500/50 outline-none"
              >
                <option value="WAREHOUSE_STAFF">Warehouse Staff (Pick, Pack, Receive)</option>
                <option value="PROCUREMENT">Procurement (POs & Suppliers)</option>
                <option value="FINANCE">Finance (Invoicing & Approvals)</option>
                <option value="ADMIN">Admin (System Full Access)</option>
                <option value="VIEWER">Viewer (Read-only)</option>
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-[#232730]">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3.5 py-1.5 border border-[#232730] text-zinc-400 hover:text-white rounded-lg text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all disabled:opacity-50"
              >
                {createMutation.isPending ? 'Provisioning...' : 'Provision Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#0E1014] border border-[#232730] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#232730] bg-[#090A0C]/80 text-[11px] font-mono uppercase text-zinc-500 tracking-wider">
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4">Credential Email</th>
                <th className="py-3 px-4">Role Profile</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1E26] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Loading personnel credentials...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400 font-mono text-xs">
                    {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                      ? 'No personnel records match query parameters.'
                      : 'No personnel registered.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: any) => {
                  const isSelf =
                    user._id === currentUser.id ||
                    user._id === currentUser._id ||
                    user.email === currentUser.email;

                  return (
                    <tr key={user._id} className="hover:bg-[#12141A] transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-[#181B22] border border-[#282D37] flex items-center justify-center font-mono font-bold text-amber-400 text-xs">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <span className="font-medium text-white">{user.name}</span>
                            {isSelf && (
                              <span className="ml-2 px-1.5 py-0.2 text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 rounded border border-amber-500/30">
                                ACTIVE SESSION
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {user.email}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border uppercase ${getRoleBadge(user.role)}`}>
                          {user.role.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border uppercase ${
                            user.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                          }`}
                        >
                          {user.isActive ? 'ACTIVE' : 'REVOKED'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(user)}
                            className="px-2.5 py-1 text-xs font-mono bg-[#181B22] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-[#282D37] rounded transition-colors"
                          >
                            Edit
                          </button>
                          {user.isActive ? (
                            !isSelf && (
                              <button
                                onClick={() => {
                                  if (confirm(`Revoke terminal access for ${user.name}?`)) {
                                    deactivateMutation.mutate(user._id);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-mono bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded transition-colors"
                              >
                                Revoke
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`Reactivate account credentials for ${user.name}?`)) {
                                  updateMutation.mutate({ id: user._id, data: { isActive: true } });
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded transition-colors"
                            >
                              Restore
                            </button>
                          )}
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1014] border border-[#232730] rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#232730] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-500">Access Management</span>
                <h3 className="text-base font-bold text-white font-mono">Edit User Parameters</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-zinc-500 hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Operator Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs focus:border-amber-500/50 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Assigned Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs font-mono focus:border-amber-500/50 outline-none"
                >
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="PROCUREMENT">Procurement</option>
                  <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                  <option value="FINANCE">Finance</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Reset Password <span className="text-zinc-600 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new secret key..."
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg text-white text-xs focus:border-amber-500/50 outline-none font-mono placeholder-zinc-700"
                  minLength={8}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  className="rounded border-[#232730] bg-[#090A0C] text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-mono text-zinc-300">
                  Account Authorized & Active
                </label>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#232730]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 border border-[#232730] text-zinc-400 hover:text-white rounded-lg text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Commit Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
