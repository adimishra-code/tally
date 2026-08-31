import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

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
    updated[index] = { ...updated[index], pickedQty: qty };
    setLines(updated);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <h3 className="text-xl font-bold text-gray-900">
                Pick Order: <span className="font-mono text-blue-600">{so.orderNumber}</span>
              </h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Customer: <span className="font-medium text-gray-800">{so.customerName}</span> • Warehouse:{' '}
              <span className="font-medium text-gray-800">{so.warehouseId?.name || 'Warehouse'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Picking items writes <code className="font-mono text-gray-800">ORDER_PICK</code> negative stock ledger entries and shifts status to <span className="font-semibold text-yellow-800">PICKING</span>.
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
                disabled={pickMutation.isPending}
                className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
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
        isInsufficient ? 'bg-red-50/50 border-red-300' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-gray-300">
              {line.productSku}
            </span>
            <span className="font-semibold text-gray-900">{line.productName}</span>
          </div>
        </div>
        <div className="text-xs text-gray-600 flex items-center gap-4">
          <span>Ordered: <strong>{line.orderedQty}</strong></span>
          <span>Already Picked: <strong>{line.alreadyPicked}</strong></span>
          <span className="text-blue-700 font-bold">Remaining: {line.remaining}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-gray-200">
        <div className="text-xs">
          <span className="text-gray-500">Warehouse Stock: </span>
          <span className={`font-bold ${availableStock === 0 ? 'text-red-600' : 'text-green-700'}`}>
            {isLoading ? 'Checking...' : `${availableStock} available`}
          </span>
          {isInsufficient && (
            <span className="text-red-600 font-semibold block mt-0.5">
              ⚠️ Requested pick exceeds available stock!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-700">Pick Qty:</label>
          <input
            type="number"
            min="0"
            max={line.remaining}
            value={line.pickedQty}
            onChange={(e) => onQtyChange(parseInt(e.target.value) || 0)}
            className="w-24 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
            required
          />
        </div>
      </div>
    </div>
  );
}
