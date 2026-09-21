import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Bin } from '../types';
import { IconInbox } from './Icons';

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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#0E1014] border border-[#2B303C] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#232730] flex items-center justify-between bg-[#12141A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#191D26] border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <IconInbox className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 font-mono tracking-tight">
                INBOUND_RECEIPT // <span className="text-amber-400">{po.poNumber}</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Vendor: <span className="font-semibold text-zinc-200">{po.supplierName}</span> • Receiving Facility:{' '}
                <span className="font-semibold text-zinc-200">{po.warehouseId?.name || 'Warehouse'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded hover:bg-[#1A1E26] transition-colors font-mono text-xs"
          >
            [ESC]
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#232730] text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            <span>Inbound Shipment Line Items</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReceiveAll}
                className="text-amber-400 hover:text-amber-300 font-bold transition-colors"
              >
                [RECEIVE_ALL_REMAINING]
              </button>
              <span className="text-zinc-700">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                [CLEAR]
              </button>
            </div>
          </div>

          {hasVariance && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs font-mono text-amber-300 flex items-start gap-2">
              <span className="text-amber-400 font-bold">⚠️</span>
              <div>
                <strong className="text-amber-200">Over-Receipt Notice:</strong> One or more items exceed remaining ordered count. This will log a variance notice on the inbound receipt.
              </div>
            </div>
          )}

          <div className="space-y-3">
            {lines.map((line, index) => {
              const isOver = line.receivedQty > line.remaining;
              return (
                <div
                  key={line.productId}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isOver ? 'bg-amber-950/25 border-amber-800/50' : 'bg-[#12141A] border-[#232730]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#1C2028]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-[#181C25] text-amber-400 px-2 py-0.5 rounded border border-[#2B313E]">
                        {line.productSku}
                      </span>
                      <h4 className="font-semibold text-zinc-100 text-xs">{line.productName}</h4>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-3">
                      <span>ORDERED: <strong className="text-zinc-200">{line.orderedQty}</strong></span>
                      <span>RECEIVED: <strong className="text-zinc-200">{line.alreadyReceived}</strong></span>
                      <span className="text-amber-400 font-bold">PENDING: {line.remaining}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-zinc-400 mb-1">
                        RECEIVING_QTY*
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={line.receivedQty}
                        onChange={(e) => updateLineField(index, 'receivedQty', parseInt(e.target.value) || 0)}
                        className={`w-full px-2.5 py-1.5 text-xs bg-[#090A0C] border rounded-md outline-none font-mono font-bold ${
                          isOver ? 'border-amber-500/60 text-amber-300' : 'border-[#262B35] text-zinc-100 focus:border-amber-500'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-zinc-400 mb-1">
                        BATCH_LOT_NUMBER
                      </label>
                      <input
                        type="text"
                        value={line.batchNumber}
                        onChange={(e) => updateLineField(index, 'batchNumber', e.target.value)}
                        placeholder="LOT-2026-A"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#090A0C] border border-[#262B35] rounded-md focus:border-amber-500 outline-none font-mono text-zinc-100 placeholder-zinc-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-zinc-400 mb-1">
                        EXPIRATION_DATE
                      </label>
                      <input
                        type="date"
                        value={line.expiryDate}
                        onChange={(e) => updateLineField(index, 'expiryDate', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#090A0C] border border-[#262B35] rounded-md focus:border-amber-500 outline-none font-mono text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-zinc-400 mb-1">
                        BIN_ZONE_ASSIGNMENT
                      </label>
                      <select
                        value={line.binId}
                        onChange={(e) => updateLineField(index, 'binId', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#090A0C] border border-[#262B35] rounded-md focus:border-amber-500 outline-none font-mono text-zinc-100"
                      >
                        <option value="">General Floor Buffer</option>
                        {bins?.map((bin) => (
                          <option key={bin._id} value={bin._id}>
                            {bin.code} {bin.zone ? `[${bin.zone}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#232730] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-zinc-500 font-mono">
              Writes immutable <code className="text-emerald-400 bg-[#161921] px-1 py-0.5 rounded border border-[#272D3A]">PO_RECEIPT</code> positive ledger entries and updates facility balance.
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#262B35] text-zinc-400 hover:text-zinc-100 hover:bg-[#161922] font-mono font-medium rounded-lg transition-colors text-xs"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={receiveMutation.isPending}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-mono font-bold rounded-lg transition-all shadow-xs disabled:opacity-50 text-xs btn-tactile"
              >
                {receiveMutation.isPending ? 'COMMITTING_RECEIPT...' : 'CONFIRM_GOODS_RECEIPT'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
