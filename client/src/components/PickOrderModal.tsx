import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { IconPackage, IconClose } from './Icons';

interface PickOrderModalProps {
  so: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface PickLineItem {
  productId: string;
  productName: string;
  productSku: string;
  orderedQty: number;
  alreadyPicked: number;
  remaining: number;
  pickedQty: number;
}

export default function PickOrderModal({ so, onClose, onSuccess }: PickOrderModalProps) {
  const warehouseId = so.warehouseId?._id || so.warehouseId;

  const [lines, setLines] = useState<PickLineItem[]>(
    so.lines.map((line: any): PickLineItem => {
      const remaining = Math.max(0, line.orderedQty - (line.pickedQty || 0));
      return {
        productId: line.productId?._id || line.productId,
        productName: line.productId?.name || 'Product',
        productSku: line.productId?.sku || 'SKU',
        orderedQty: line.orderedQty,
        alreadyPicked: line.pickedQty || 0,
        remaining,
        pickedQty: remaining,
      };
    })
  );

  const updatePickedQty = (index: number, qty: number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], pickedQty: Math.max(0, qty) };
    setLines(updated);
  };

  const handlePickAll = () => {
    setLines(lines.map((l) => ({ ...l, pickedQty: l.remaining })));
  };

  const handleClearAll = () => {
    setLines(lines.map((l) => ({ ...l, pickedQty: 0 })));
  };

  const pickMutation = useMutation({
    mutationFn: (payload: any) => api.post('/sales-orders/pick', payload),
    onSuccess: () => {
      toast.success('Items picked and stock deducted from ledger!');
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to pick items');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    for (const line of lines) {
      if (line.pickedQty > line.remaining) {
        toast.error(`Cannot pick ${line.pickedQty} for ${line.productSku}. Max remaining is ${line.remaining}`);
        return;
      }
    }

    const linesToPick = lines
      .filter((l) => l.pickedQty > 0)
      .map((l) => ({
        productId: l.productId,
        pickedQty: Number(l.pickedQty),
        warehouseId,
      }));

    if (linesToPick.length === 0) {
      toast.error('Please enter a pick quantity of at least 1 for at least one item');
      return;
    }

    pickMutation.mutate({
      orderId: so._id,
      lines: linesToPick,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <IconPackage className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Pick Order: <span className="font-mono text-cyan-400">{so.orderNumber}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customer: <span className="font-medium text-slate-200">{so.customerName}</span> • Warehouse:{' '}
                  <span className="font-medium text-slate-200">{so.warehouseId?.name || 'Warehouse'}</span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Line Items to Pick</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePickAll}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
              >
                Pick All Remaining
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

          <div className="space-y-3">
            {lines.map((line, index) => (
              <PickLineRow
                key={line.productId}
                line={line}
                warehouseId={warehouseId}
                onQtyChange={(qty) => updatePickedQty(index, qty)}
              />
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Picking items writes <code className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">ORDER_PICK</code> negative stock ledger entries and shifts status to <span className="font-semibold text-amber-300">PICKING</span>.
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
                disabled={pickMutation.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 text-sm"
              >
                {pickMutation.isPending ? 'Picking Items...' : 'Confirm Pick & Deduct Stock'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function PickLineRow({
  line,
  warehouseId,
  onQtyChange,
}: {
  line: PickLineItem;
  warehouseId: string;
  onQtyChange: (qty: number) => void;
}) {
  const { data: stockData, isLoading } = useQuery({
    queryKey: ['stock-balance', line.productId, warehouseId],
    queryFn: async () => {
      const res = await api.get(`/stock/balance/${line.productId}/${warehouseId}`);
      return res.data;
    },
  });

  const availableStock = stockData?.balance ?? 0;
  const isInsufficient = availableStock < line.pickedQty;

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isInsufficient ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-950/60 border-slate-800/80'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-slate-900 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
              {line.productSku}
            </span>
            <span className="font-semibold text-white">{line.productName}</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-4">
          <span>Ordered: <strong className="text-slate-200 font-mono">{line.orderedQty}</strong></span>
          <span>Already Picked: <strong className="text-slate-200 font-mono">{line.alreadyPicked}</strong></span>
          <span className="text-cyan-400 font-bold font-mono">Remaining: {line.remaining}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
        <div className="text-xs">
          <span className="text-slate-400">Warehouse Stock: </span>
          <span className={`font-bold font-mono ${availableStock === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isLoading ? 'Checking...' : `${availableStock} available`}
          </span>
          {isInsufficient && (
            <span className="text-rose-400 font-medium block mt-0.5">
              ⚠️ Requested pick exceeds available warehouse stock!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-300">Pick Qty:</label>
          <input
            type="number"
            min="0"
            max={line.remaining}
            value={line.pickedQty}
            onChange={(e) => onQtyChange(parseInt(e.target.value) || 0)}
            className="w-24 px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none font-mono font-bold text-center text-white"
            required
          />
        </div>
      </div>
    </div>
  );
}
