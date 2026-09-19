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
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Users exported to CSV');
    } catch {
      toast.error('Failed to export users');
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
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
      toast.success('User updated successfully');
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
      toast.success('User deactivated successfully');
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
    const colors: Record<string, string> = {
      OWNER: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      ADMIN: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      PROCUREMENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      WAREHOUSE_STAFF: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      FINANCE: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      VIEWER: 'bg-slate-800 text-slate-400 border-slate-700',
    };
    return colors[role] || 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">User Management</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Manage team members, roles, and granular security permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportUsersCSV}
            className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <IconExport className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
          >
            {showForm ? 'Cancel' : '+ Add User'}
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Users</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white">{totalUsers}</div>
          <div className="text-xs text-slate-500 mt-1">Configured accounts</div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Active Accounts</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">{activeCount}</div>
          <div className="text-xs text-slate-500 mt-1">Authorized access</div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Admins & Owners</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400">{adminCount}</div>
          <div className="text-xs text-slate-500 mt-1">Privileged managers</div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Warehouse Staff</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">{staffCount}</div>
          <div className="text-xs text-slate-500 mt-1">Operations team</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-sm text-white placeholder-slate-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="PROCUREMENT">Procurement</option>
            <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
            <option value="FINANCE">Finance</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({totalUsers})
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
              Inactive ({totalUsers - activeCount})
            </button>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 text-slate-100 animate-in fade-in duration-200">
          <h3 className="text-base font-bold text-white mb-4">New User</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Name*</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email*</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password*</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role*</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm font-medium"
              >
                <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                <option value="PROCUREMENT">Procurement</option>
                <option value="FINANCE">Finance</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 text-sm"
              >
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-950/60 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                      ? 'No users match your filters'
                      : 'No users found'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: any) => {
                  const isSelf =
                    user._id === currentUser.id ||
                    user._id === currentUser._id ||
                    user.email === currentUser.email;

                  return (
                    <tr key={user._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{user.name}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/30">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-300">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md border uppercase ${getRoleBadge(user.role)}`}>
                          {user.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md border uppercase ${
                            user.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800/80 transition-colors"
                          >
                            Edit
                          </button>
                          {user.isActive ? (
                            !isSelf && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to deactivate ${user.name}?`)) {
                                    deactivateMutation.mutate(user._id);
                                  }
                                }}
                                className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800/80 transition-colors"
                              >
                                Deactivate
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`Reactivate account for ${user.name}?`)) {
                                  updateMutation.mutate({ id: user._id, data: { isActive: true } });
                                }
                              }}
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800/80 transition-colors"
                            >
                              Reactivate
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white">Edit User</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Name*</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role*</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm font-medium"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reset Password <span className="text-[11px] text-slate-500">(optional)</span>
                </label>
                <input
                  type="password"
                  placeholder="Leave empty to keep unchanged"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm placeholder-slate-500"
                  minLength={8}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-medium text-slate-300">
                  Active Account
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800/80 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 text-sm"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
