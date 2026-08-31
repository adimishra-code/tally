import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Bin } from '../types';

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
        expiryDate: l.expiryDate ? new Date(l.expiryDate).toISOString() : undefined,
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📥</span>
              <h3 className="text-xl font-bold text-gray-900">
                Receive Goods: <span className="font-mono text-blue-600">{po.poNumber}</span>
              </h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Supplier: <span className="font-medium text-gray-800">{po.supplierName}</span> • Warehouse:{' '}
              <span className="font-medium text-gray-800">{po.warehouseId?.name || 'Warehouse'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {hasVariance && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
              <span>⚠️</span>
              <div>
                <strong>Over-receipt Variance Detected:</strong> One or more items have received quantities higher than the remaining ordered quantity. This will be flagged in the receiving audit.
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
                    isOver ? 'bg-yellow-50/50 border-yellow-300' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-gray-300">
                          {line.productSku}
                        </span>
                        <h4 className="font-semibold text-gray-900 text-base">{line.productName}</h4>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-4">
                      <span>Ordered: <strong>{line.orderedQty}</strong></span>
                      <span>Already Recv: <strong>{line.alreadyReceived}</strong></span>
                      <span className="text-blue-700 font-bold">Remaining: {line.remaining}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Receiving Now*
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={line.receivedQty}
                        onChange={(e) => updateLineField(index, 'receivedQty', parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold ${
                          isOver ? 'border-yellow-400 text-yellow-900' : 'border-gray-300 text-gray-900'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Batch / Lot Number
                      </label>
                      <input
                        type="text"
                        value={line.batchNumber}
                        onChange={(e) => updateLineField(index, 'batchNumber', e.target.value)}
                        placeholder="e.g. LOT-2026-A"
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Expiration Date
                      </label>
                      <input
                        type="date"
                        value={line.expiryDate}
                        onChange={(e) => updateLineField(index, 'expiryDate', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Assign Bin Location
                      </label>
                      <select
                        value={line.binId}
                        onChange={(e) => updateLineField(index, 'binId', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      >
                        <option value="">General Floor</option>
                        {bins?.map((bin) => (
                          <option key={bin._id} value={bin._id}>
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

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Receiving goods writes immutable <code className="font-mono text-gray-800">PO_RECEIPT</code> ledger entries and updates real-time stock balances.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={receiveMutation.isPending}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
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
