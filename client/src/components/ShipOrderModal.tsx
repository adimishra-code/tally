import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

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
    updated[index] = { ...updated[index], shippedQty: qty };
    setLines(updated);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚚</span>
              <h3 className="text-xl font-bold text-gray-900">
                Dispatch Shipment: <span className="font-mono text-blue-600">{so.orderNumber}</span>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Logistics Carrier*
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="DHL">DHL Express</option>
                <option value="USPS">USPS</option>
                <option value="Blue Dart">Blue Dart</option>
                <option value="Freight / Other">Freight / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tracking / AWB Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. TRK-987654321"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-800">Select Items to Ship</h4>
            {lines.map((line, index) => (
              <div
                key={line.productId}
                className="p-4 rounded-xl border border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                      {line.productSku}
                    </span>
                    <span className="font-semibold text-gray-900">{line.productName}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex gap-3">
                    <span>Picked: <strong>{line.pickedQty}</strong></span>
                    <span>Already Shipped: <strong>{line.alreadyShipped}</strong></span>
                    <span className="text-blue-700 font-bold">Remaining to Ship: {line.remainingToShip}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-700">Ship Qty:</label>
                  <input
                    type="number"
                    min="0"
                    max={line.remainingToShip}
                    value={line.shippedQty}
                    onChange={(e) => updateShippedQty(index, parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Generates an immutable <code className="font-mono text-gray-800">Shipment</code> audit record and updates delivery tracking.
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
                disabled={shipMutation.isPending}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
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
