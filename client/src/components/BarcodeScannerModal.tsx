import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Product, Warehouse } from '../types';

interface BarcodeScannerModalProps {
  onClose: () => void;
}

export default function BarcodeScannerModal({ onClose }: BarcodeScannerModalProps) {
  const [barcode, setBarcode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data } = await api.get('/warehouses');
      return data;
    },
  });

  const scanMutation = useMutation({
    mutationFn: (code: string) => api.post('/receiving/barcode-lookup', { barcode: code }),
    onSuccess: (res) => {
      setScannedProduct(res.data);
      toast.success(`Found product: ${res.data.name}`);
    },
    onError: () => {
      toast.error(`No active product found with SKU/barcode "${barcode}"`);
      setScannedProduct(null);
    },
  });

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    scanMutation.mutate(barcode.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h3 className="text-lg font-bold text-gray-900">Barcode & SKU Lookup</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Scan Input Form */}
        <form onSubmit={handleScanSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Scan Barcode or Type SKU
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2.5 text-gray-400 text-base">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.toUpperCase())}
                placeholder="e.g. SKU-PROD-001"
                className="w-full pl-10 pr-4 py-2.5 font-mono font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                required
              />
            </div>
            <button
              type="submit"
              disabled={scanMutation.isPending}
              className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {scanMutation.isPending ? 'Searching...' : 'Scan'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Handheld optical scanners configured in keyboard wedge mode will trigger scan automatically on Enter.
          </p>
        </form>

        {/* Scanned Product Card */}
        {scannedProduct && (
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-blue-300 text-blue-800">
                  {scannedProduct.sku}
                </span>
                <h4 className="font-bold text-gray-900 text-lg mt-1">{scannedProduct.name}</h4>
                {scannedProduct.description && (
                  <p className="text-xs text-gray-600 mt-0.5">{scannedProduct.description}</p>
                )}
              </div>
              <span
                className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                  scannedProduct.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {scannedProduct.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-100 text-xs">
              <div>
                <span className="text-gray-500 block">Cost Price</span>
                <span className="font-bold text-gray-900">${scannedProduct.costPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Sell Price</span>
                <span className="font-bold text-gray-900">${scannedProduct.sellPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Reorder Point</span>
                <span className="font-bold text-gray-900">{scannedProduct.reorderPoint} {scannedProduct.unit}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Reorder Qty</span>
                <span className="font-bold text-gray-900">{scannedProduct.reorderQty} {scannedProduct.unit}</span>
              </div>
            </div>

            {/* Warehouse Stock Levels */}
            <div className="pt-2 border-t border-blue-100">
              <span className="text-xs font-semibold text-gray-700 mb-2 block">Warehouse Availability:</span>
              <div className="space-y-1">
                {warehouses?.map((wh) => (
                  <WarehouseStockRow
                    key={wh._id}
                    warehouseId={wh._id}
                    warehouseName={wh.name}
                    productId={scannedProduct._id}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function WarehouseStockRow({
  warehouseId,
  warehouseName,
  productId,
}: {
  warehouseId: string;
  warehouseName: string;
  productId: string;
}) {
  const { data } = useQuery({
    queryKey: ['stock-balance', productId, warehouseId],
    queryFn: async () => {
      const res = await api.get(`/stock/balance/${productId}/${warehouseId}`);
      return res.data;
    },
  });

  return (
    <div className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded border border-gray-200">
      <span className="text-gray-700 font-medium">{warehouseName}</span>
      <span className="font-bold text-blue-700">
        {data !== undefined ? `${data.balance} on hand` : 'Checking...'}
      </span>
    </div>
  );
}
