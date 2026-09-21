import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { IconTruck } from './Icons';

interface ShipOrderModalProps {
  so: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface ShipLineItem {
  productId: string;
  productName: string;
  productSku: string;
  orderedQty: number;
  pickedQty: number;
  alreadyShipped: number;
  remainingToShip: number;
  shippedQty: number;
}

export default function ShipOrderModal({ so, onClose, onSuccess }: ShipOrderModalProps) {
  const [carrier, setCarrier] = useState('FedEx');
  const [trackingNumber, setTrackingNumber] = useState('');

  const [lines, setLines] = useState<ShipLineItem[]>(
    so.lines.map((line: any): ShipLineItem => {
      const picked = line.pickedQty || 0;
      const shipped = line.shippedQty || 0;
      const remainingToShip = Math.max(0, picked - shipped);
      return {
        productId: line.productId?._id || line.productId,
        productName: line.productId?.name || 'Product',
        productSku: line.productId?.sku || 'SKU',
        orderedQty: line.orderedQty,
        pickedQty: picked,
        alreadyShipped: shipped,
        remainingToShip,
        shippedQty: remainingToShip,
      };
    })
  );

  const updateShippedQty = (index: number, qty: number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], shippedQty: Math.max(0, qty) };
    setLines(updated);
  };

  const handleShipAll = () => {
    setLines(lines.map((l) => ({ ...l, shippedQty: l.remainingToShip })));
  };

  const handleClearAll = () => {
    setLines(lines.map((l) => ({ ...l, shippedQty: 0 })));
  };

  const shipMutation = useMutation({
    mutationFn: (payload: any) => api.post('/sales-orders/ship', payload),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Shipment dispatched successfully!');
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to dispatch shipment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    for (const line of lines) {
      if (line.shippedQty > line.remainingToShip) {
        toast.error(`Cannot ship ${line.shippedQty} for ${line.productSku}. Max ready to ship is ${line.remainingToShip}`);
        return;
      }
    }

    const linesToShip = lines
      .filter((l) => l.shippedQty > 0)
      .map((l) => ({
        productId: l.productId,
        shippedQty: Number(l.shippedQty),
      }));

    if (linesToShip.length === 0) {
      toast.error('Please specify a shipped quantity of at least 1 for at least one item');
      return;
    }

    shipMutation.mutate({
      orderId: so._id,
      carrier,
      trackingNumber: trackingNumber.trim() || undefined,
      lines: linesToShip,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#0E1014] border border-[#2B303C] rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="p-5 border-b border-[#232730] flex items-center justify-between bg-[#12141A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#191D26] border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <IconTruck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 font-mono tracking-tight">
                OUTBOUND_DISPATCH // <span className="text-amber-400">{so.orderNumber}</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Client: <span className="font-semibold text-zinc-200">{so.customerName}</span> • Origin:{' '}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#12141A] p-3.5 rounded-lg border border-[#232730]">
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-400 mb-1">
                LOGISTICS_CARRIER*
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#090A0C] border border-[#262B35] rounded-md focus:border-amber-500 outline-none text-zinc-100 font-mono font-medium"
              >
                <option value="FedEx">FedEx Express</option>
                <option value="UPS">UPS Worldwide</option>
                <option value="DHL">DHL Express</option>
                <option value="USPS">USPS Priority</option>
                <option value="Blue Dart">Blue Dart</option>
                <option value="Freight / Dedicated">Dedicated Fleet / Freight</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-400 mb-1">
                WAYBILL_TRACKING_NUMBER
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="TRK-987654321"
                className="w-full px-3 py-1.5 text-xs bg-[#090A0C] border border-[#262B35] rounded-md focus:border-amber-500 outline-none font-mono text-zinc-100 placeholder-zinc-600"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#232730] text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              <span>Verified Picked Items Ready to Ship</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShipAll}
                  className="text-amber-400 hover:text-amber-300 font-bold transition-colors"
                >
                  [SHIP_ALL_PICKED]
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

            {lines.map((line, index) => (
              <div
                key={line.productId}
                className="p-3.5 rounded-lg border border-[#232730] bg-[#12141A] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-[#181C25] text-amber-400 px-2 py-0.5 rounded border border-[#2B313E]">
                      {line.productSku}
                    </span>
                    <span className="font-semibold text-zinc-100 text-xs">{line.productName}</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 mt-1 flex gap-3">
                    <span>PICKED: <strong className="text-zinc-200">{line.pickedQty}</strong></span>
                    <span>SHIPPED: <strong className="text-zinc-200">{line.alreadyShipped}</strong></span>
                    <span className="text-amber-400 font-bold">READY: {line.remainingToShip}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-mono font-bold text-zinc-400">SHIP_QTY:</label>
                  <input
                    type="number"
                    min="0"
                    max={line.remainingToShip}
                    value={line.shippedQty}
                    onChange={(e) => updateShippedQty(index, parseInt(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1 text-xs bg-[#090A0C] border border-[#262B35] rounded-md focus:border-amber-500 outline-none font-mono font-bold text-center text-zinc-100"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#232730] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-zinc-500 font-mono">
              Generates immutable <code className="text-amber-400 bg-[#161921] px-1 py-0.5 rounded border border-[#272D3A]">Shipment</code> audit records and updates fulfillment pipeline.
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
                disabled={shipMutation.isPending}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-mono font-bold rounded-lg transition-all shadow-xs disabled:opacity-50 text-xs btn-tactile"
              >
                {shipMutation.isPending ? 'DISPATCHING...' : 'CONFIRM_DISPATCH'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
