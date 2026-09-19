import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Organization } from '../types';

export default function Settings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    poApprovalThreshold: 10000,
  });

  const { data: org, isLoading } = useQuery<Organization>({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data } = await api.get('/organization');
      return data;
    },
  });

  useEffect(() => {
    if (org) {
      setFormData({
        name: org.name,
        poApprovalThreshold: org.poApprovalThreshold,
      });
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => api.patch('/organization', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Organization settings saved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500">
        Loading organization settings...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Organization Settings</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Manage business policies, approval thresholds, and workspace metadata</p>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl text-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-slate-800/80 pb-6">
            <h3 className="text-base font-bold text-white mb-4">Company Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Organization Slug (Identifier)</label>
                <input
                  type="text"
                  value={org?.slug || ''}
                  disabled
                  className="w-full px-4 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-500 font-mono text-sm outline-none cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-500 mt-1">Used for employee logins to your tenant</p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-800/80 pb-6">
            <h3 className="text-base font-bold text-white mb-2">Purchase Order Approval Policy</h3>
            <p className="text-xs text-slate-400 mb-4">
              POs with total value above this threshold will require explicit approval from an Owner or Admin before they can be sent to suppliers.
            </p>

            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Approval Threshold ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-slate-500 font-medium text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.poApprovalThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, poApprovalThreshold: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-8 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white font-mono text-sm"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 text-sm"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
