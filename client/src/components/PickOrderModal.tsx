import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { IconPackage } from './Icons';

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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#0E1014] border border-[#2B303C] rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="p-5 border-b border-[#232730] flex items-center justify-between bg-[#12141A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#191D26] border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <IconPackage className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 font-mono tracking-tight">
                PICK_DISPATCH // <span className="text-amber-400">{so.orderNumber}</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Client: <span className="font-semibold text-zinc-200">{so.customerName}</span> • Facility:{' '}
                <span className="font-semibold text-zinc-200">{so.warehouseId?.name || 'Warehouse'}</span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#232730] text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            <span>Manifest Items to Pick</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePickAll}
                className="text-amber-400 hover:text-amber-300 font-bold transition-colors"
              >
                [PICK_ALL_REMAINING]
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

          <div className="space-y-2.5">
            {lines.map((line, index) => (
              <PickLineRow
                key={line.productId}
                line={line}
                warehouseId={warehouseId}
                onQtyChange={(qty) => updatePickedQty(index, qty)}
              />
            ))}
          </div>

          <div className="pt-4 border-t border-[#232730] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-zinc-500 font-mono">
              Records <code className="text-amber-400 bg-[#161921] px-1 py-0.5 rounded border border-[#272D3A]">ORDER_PICK</code> append-only ledger deduction entries.
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
                disabled={pickMutation.isPending}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-mono font-bold rounded-lg transition-all shadow-xs disabled:opacity-50 text-xs btn-tactile"
              >
                {pickMutation.isPending ? 'COMMITTING_PICKS...' : 'CONFIRM_PICK_DISPATCH'}
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
      className={`p-3.5 rounded-lg border transition-all ${
        isInsufficient ? 'bg-rose-950/25 border-rose-800/50' : 'bg-[#12141A] border-[#232730]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold bg-[#181C25] text-amber-400 px-2 py-0.5 rounded border border-[#2B313E]">
            {line.productSku}
          </span>
          <span className="font-semibold text-zinc-100 text-xs">{line.productName}</span>
        </div>
        <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-3">
          <span>ORD: <strong className="text-zinc-200">{line.orderedQty}</strong></span>
          <span>PICKED: <strong className="text-zinc-200">{line.alreadyPicked}</strong></span>
          <span className="text-amber-400 font-bold">REM: {line.remaining}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-[#1C2028]">
        <div className="text-xs font-mono">
          <span className="text-zinc-500">FACILITY_BALANCE: </span>
          <span className={`font-bold ${availableStock === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isLoading ? '...' : `${availableStock} units`}
          </span>
          {isInsufficient && (
            <span className="text-rose-400 font-medium block mt-0.5 text-[10px]">
              ⚠️ Requested pick exceeds on-hand stock!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-mono font-bold text-zinc-400">PICK_QTY:</label>
          <input
            type="number"
            min="0"
            max={line.remaining}
            value={line.pickedQty}
            onChange={(e) => onQtyChange(parseInt(e.target.value) || 0)}
            className="w-20 px-2.5 py-1 text-xs bg-[#090A0C] border border-[#262B35] rounded-md focus:border-amber-500 outline-none font-mono font-bold text-center text-zinc-100"
            required
          />
        </div>
      </div>
    </div>
  );
}
