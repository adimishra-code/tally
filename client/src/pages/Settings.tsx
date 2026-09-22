import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Organization } from '../types';
import { useSocket } from '../context/SocketContext';

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { isConnected } = useSocket();
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

  // Real-time backend system health telemetry
  const {
    data: healthData,
    isFetching: isFetchingHealth,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const start = performance.now();
      const { data } = await api.get('/health');
      const ping = Math.round(performance.now() - start);
      return { ...data, latencyMs: ping };
    },
    refetchInterval: 20000,
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

  const handleTestPing = async () => {
    const res = await refetchHealth();
    if (res.data?.status === 'healthy') {
      toast.success(`Operational node response: ${res.data.latencyMs}ms latency`);
    } else {
      toast.error('System diagnostics reported non-optimal state');
    }
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
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500/90 font-semibold">
            Config // System Preferences & Telemetry
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
          Tenant Settings & Node Diagnostics
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 font-mono">
          Procurement threshold policies, workspace partitions, and live server resource telemetry
        </p>
      </div>

      {/* Real-time System Diagnostics Dashboard Panel */}
      <div className="bg-[#0E1014] rounded-xl border border-[#232730] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C2028] pb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                healthData?.status === 'healthy' ? 'bg-emerald-400 led-pulse-emerald animate-pulse' : 'bg-amber-400'
              }`}
            />
            <div>
              <h2 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wider">
                Live Server Health & Telemetry
              </h2>
              <span className="text-[11px] text-zinc-500 font-mono">
                API Service: {healthData?.service || 'tally-warehouse-api'} • Node: {healthData?.system?.nodeVersion || 'v20.x'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestPing}
              disabled={isFetchingHealth}
              className="px-3 py-1.5 bg-[#14171E] hover:bg-[#1C202A] border border-[#262B37] text-amber-400 text-xs font-mono font-semibold rounded-lg transition-colors flex items-center gap-1.5 btn-tactile disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${isFetchingHealth ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isFetchingHealth ? 'PINGING...' : 'PING_DIAGNOSTICS'}</span>
            </button>
          </div>
        </div>

        {/* Diagnostics Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#12141A] border border-[#20242D] space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">API Latency</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-emerald-400">{healthData?.latencyMs ?? '--'}</span>
              <span className="text-[10px] text-zinc-500">ms</span>
            </div>
            <span className="text-[9px] text-zinc-600 block">ROUND_TRIP_TIME</span>
          </div>

          <div className="p-3 rounded-lg bg-[#12141A] border border-[#20242D] space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Process Uptime</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-zinc-100">{formatUptime(healthData?.uptimeSeconds ?? 0)}</span>
            </div>
            <span className="text-[9px] text-zinc-600 block">SYSTEM_LIFETIME</span>
          </div>

          <div className="p-3 rounded-lg bg-[#12141A] border border-[#20242D] space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Memory (RSS / Heap)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-amber-400">{healthData?.system?.memoryRssMb ?? '--'}</span>
              <span className="text-[10px] text-zinc-500">/ {healthData?.system?.memoryHeapUsedMb ?? '--'} MB</span>
            </div>
            <span className="text-[9px] text-zinc-600 block">NODE_FOOTPRINT</span>
          </div>

          <div className="p-3 rounded-lg bg-[#12141A] border border-[#20242D] space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Database & Bus</span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-zinc-100 uppercase">
                {healthData?.database?.status === 'connected' ? 'DB_ONLINE' : 'DEGRADED'}
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 block">
              WS: {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>
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
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 btn-tactile"
            >
              {updateMutation.isPending ? 'Committing...' : 'Commit Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
