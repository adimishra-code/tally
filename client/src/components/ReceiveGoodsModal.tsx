import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Bin } from '../types';
import { IconInbox, IconClose } from './Icons';

interface ReceiveGoodsModalProps {
  po: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface ReceiveLineItem {
  productId: string;
  productName: string;
  productSku: string;
  orderedQty: number;
  alreadyReceived: number;
  remaining: number;
  receivedQty: number;
  batchNumber: string;
  expiryDate: string;
  binId: string;
}

export default function ReceiveGoodsModal({ po, onClose, onSuccess }: ReceiveGoodsModalProps) {
  const warehouseId = po.warehouseId?._id || po.warehouseId;

  // Fetch available bins for this warehouse
  const { data: bins } = useQuery<Bin[]>({
    queryKey: ['bins', warehouseId],
    queryFn: async () => {
      if (!warehouseId) return [];
      const { data } = await api.get(`/bins/warehouse/${warehouseId}`);
      return data;
    },
    enabled: !!warehouseId,
  });

  // Initialize lines state
  const [lines, setLines] = useState<ReceiveLineItem[]>(
    po.lines.map((line: any): ReceiveLineItem => {
      const remaining = Math.max(0, line.orderedQty - (line.receivedQty || 0));
      return {
        productId: line.productId?._id || line.productId,
        productName: line.productId?.name || 'Product',
        productSku: line.productId?.sku || 'SKU',
        orderedQty: line.orderedQty,
        alreadyReceived: line.receivedQty || 0,
        remaining,
        receivedQty: remaining,
        batchNumber: '',
        expiryDate: '',
        binId: '',
      };
    })
  );

  const updateLineField = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleReceiveAll = () => {
    setLines(lines.map((l) => ({ ...l, receivedQty: l.remaining })));
  };

  const handleClearAll = () => {
    setLines(lines.map((l) => ({ ...l, receivedQty: 0 })));
  };

  const receiveMutation = useMutation({
    mutationFn: (payload: any) => api.post('/receiving', payload),
    onSuccess: (res) => {
      if (res.data.variances && res.data.variances.length > 0) {
        toast.success(`Goods received with ${res.data.variances.length} variance notice(s)`);
      } else {
        toast.success('Goods received and stock ledger updated!');
      }
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to receive goods');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter lines where receivedQty > 0
    const linesToReceive = lines
      .filter((l) => l.receivedQty > 0)
      .map((l) => ({
        productId: l.productId,
        receivedQty: Number(l.receivedQty),
        batchNumber: l.batchNumber ? l.batchNumber.trim() : undefined,
        expiryDate: l.expiryDate && !isNaN(Date.parse(l.expiryDate)) ? new Date(l.expiryDate).toISOString() : undefined,
        binId: l.binId || undefined,
      }));

    if (linesToReceive.length === 0) {
      toast.error('Please enter a received quantity of at least 1 for at least one item');
      return;
    }

    receiveMutation.mutate({
      poId: po._id,
      lines: linesToReceive,
    });
  };

  // Check for any lines receiving more than remaining
  const hasVariance = lines.some((l) => l.receivedQty > l.remaining);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <IconInbox className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Receive Goods: <span className="font-mono text-cyan-400">{po.poNumber}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supplier: <span className="font-medium text-slate-200">{po.supplierName}</span> • Warehouse:{' '}
                  <span className="font-medium text-slate-200">{po.warehouseId?.name || 'Warehouse'}</span>
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Line Items to Receive</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReceiveAll}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
              >
                Receive All Remaining
              </button>
              <span className="text-slate-700">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          {hasVariance && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
              <span className="text-base">⚠️</span>
              <div>
                <strong className="font-semibold text-amber-200">Over-receipt Variance Detected:</strong> One or more items have received quantities higher than the remaining ordered quantity. This will be flagged in the receiving audit.
              </div>
            </div>
          )}

          <div className="space-y-4">
            {lines.map((line, index) => {
              const isOver = line.receivedQty > line.remaining;
              return (
                <div
                  key={line.productId}
                  className={`p-4 rounded-xl border transition-all ${
                    isOver ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-900 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                          {line.productSku}
                        </span>
                        <h4 className="font-semibold text-white text-sm sm:text-base">{line.productName}</h4>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-4">
                      <span>Ordered: <strong className="text-slate-200 font-mono">{line.orderedQty}</strong></span>
                      <span>Already Recv: <strong className="text-slate-200 font-mono">{line.alreadyReceived}</strong></span>
                      <span className="text-cyan-400 font-bold font-mono">Remaining: {line.remaining}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Receiving Now*
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={line.receivedQty}
                        onChange={(e) => updateLineField(index, 'receivedQty', parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 text-sm bg-slate-900 border rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none font-mono font-bold ${
                          isOver ? 'border-amber-500/50 text-amber-300' : 'border-slate-700 text-white'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Batch / Lot Number
                      </label>
                      <input
                        type="text"
                        value={line.batchNumber}
                        onChange={(e) => updateLineField(index, 'batchNumber', e.target.value)}
                        placeholder="e.g. LOT-2026-A"
                        className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none font-mono text-white placeholder-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Expiration Date
                      </label>
                      <input
                        type="date"
                        value={line.expiryDate}
                        onChange={(e) => updateLineField(index, 'expiryDate', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none font-mono text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Assign Bin Location
                      </label>
                      <select
                        value={line.binId}
                        onChange={(e) => updateLineField(index, 'binId', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none font-mono text-white"
                      >
                        <option value="" className="bg-slate-900 text-slate-300">General Floor</option>
                        {bins?.map((bin) => (
                          <option key={bin._id} value={bin._id} className="bg-slate-900 text-white">
                            {bin.code} {bin.zone ? `(${bin.zone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Receiving goods writes immutable <code className="font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">PO_RECEIPT</code> ledger entries and updates real-time stock balances.
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800/80 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={receiveMutation.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 text-sm"
              >
                {receiveMutation.isPending ? 'Processing Receipt...' : 'Confirm & Post Goods Receipt'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
