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
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-500">
        Loading organization settings...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Organization Settings</h2>
        <p className="text-gray-600">Manage business policies, approval thresholds, and workspace metadata</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-gray-100 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Slug (Identifier)</label>
                <input
                  type="text"
                  value={org?.slug || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 font-mono outline-none cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Used for employee logins to your tenant</p>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Purchase Order Approval Policy</h3>
            <p className="text-sm text-gray-500 mb-4">
              POs with total value above this threshold will require explicit approval from an Owner or Admin before they can be sent to suppliers.
            </p>

            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approval Threshold ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-500 font-medium">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.poApprovalThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, poApprovalThreshold: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
