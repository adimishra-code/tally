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
      toast.success('Organization configuration committed');
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
      <div className="max-w-4xl mx-auto py-16 text-center text-zinc-500 font-mono text-xs">
        Loading organization parameters...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#232730] pb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500/90 font-semibold">Config // System Preferences</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">Tenant Organization Settings</h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">Control procurement threshold policies, corporate identity, and tenant namespace parameters</p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-6 shadow-xl text-zinc-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-[#1F232B] pb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Enterprise Profile</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Company / Facility Legal Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg focus:border-amber-500/50 outline-none text-white text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Tenant Slug (Identifier Namespace)</label>
                <input
                  type="text"
                  value={org?.slug || ''}
                  disabled
                  className="w-full px-3 py-2 bg-[#090A0C]/50 border border-[#232730] rounded-lg text-zinc-500 font-mono text-xs outline-none cursor-not-allowed"
                />
                <p className="text-[10px] font-mono text-zinc-500 mt-1">Immutable tenant partition key used for workspace isolation</p>
              </div>
            </div>
          </div>

          <div className="border-b border-[#1F232B] pb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Purchase Order Approval Policy</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Purchase orders with total value equal to or exceeding this threshold trigger mandatory approval review by an authorized Owner or Admin before supplier transmission.
            </p>

            <div className="max-w-md">
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Approval Threshold ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-zinc-500 font-mono text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.poApprovalThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, poApprovalThreshold: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-8 pr-3 py-2 bg-[#090A0C] border border-[#232730] rounded-lg focus:border-amber-500/50 outline-none text-white font-mono text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* System Telemetry Metadata */}
          <div className="border-b border-[#1F232B] pb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">System Node Metadata</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#090A0C] border border-[#232730] rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Security Architecture</div>
                <div className="text-xs font-mono text-zinc-200 mt-1 font-semibold">JWT + Argon2id</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Dual-layer token hashing</div>
              </div>

              <div className="bg-[#090A0C] border border-[#232730] rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Queue & Monitoring</div>
                <div className="text-xs font-mono text-zinc-200 mt-1 font-semibold">BullMQ + Redis 7.x</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Automated stock health sweep</div>
              </div>

              <div className="bg-[#090A0C] border border-[#232730] rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase text-zinc-500">Live Socket Channel</div>
                <div className="text-xs font-mono text-amber-400 mt-1 font-semibold">ws://tally-live</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Bi-directional event bus</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Committing...' : 'Commit Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
