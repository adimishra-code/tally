import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { IconTruck, IconClose } from './Icons';

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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <IconTruck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Dispatch Shipment: <span className="font-mono text-cyan-400">{so.orderNumber}</span>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Logistics Carrier*
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-white font-medium"
              >
                <option value="FedEx" className="bg-slate-900 text-white">FedEx</option>
                <option value="UPS" className="bg-slate-900 text-white">UPS</option>
                <option value="DHL" className="bg-slate-900 text-white">DHL Express</option>
                <option value="USPS" className="bg-slate-900 text-white">USPS</option>
                <option value="Blue Dart" className="bg-slate-900 text-white">Blue Dart</option>
                <option value="Freight / Other" className="bg-slate-900 text-white">Freight / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tracking / AWB Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. TRK-987654321"
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none font-mono text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Items to Ship</h4>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleShipAll}
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  Ship All Picked
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
            {lines.map((line, index) => (
              <div
                key={line.productId}
                className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-900 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                      {line.productSku}
                    </span>
                    <span className="font-semibold text-white">{line.productName}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex gap-3">
                    <span>Picked: <strong className="text-slate-200 font-mono">{line.pickedQty}</strong></span>
                    <span>Already Shipped: <strong className="text-slate-200 font-mono">{line.alreadyShipped}</strong></span>
                    <span className="text-cyan-400 font-bold font-mono">Remaining to Ship: {line.remainingToShip}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-300">Ship Qty:</label>
                  <input
                    type="number"
                    min="0"
                    max={line.remainingToShip}
                    value={line.shippedQty}
                    onChange={(e) => updateShippedQty(index, parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none font-mono font-bold text-center text-white"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Generates an immutable <code className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Shipment</code> audit record and updates delivery tracking.
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
                disabled={shipMutation.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-sm"
              >
                {shipMutation.isPending ? 'Generating Shipment...' : 'Confirm Shipment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
