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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚡</span>
            <h3 className="text-base font-bold text-white tracking-tight">Barcode & SKU Lookup</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scan Input Form */}
        <form onSubmit={handleScanSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            Scan Barcode or Type SKU
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2.5 text-slate-500 text-base">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.toUpperCase())}
                placeholder="e.g. SKU-PROD-001"
                className="w-full pl-10 pr-4 py-2.5 font-mono font-semibold bg-slate-950 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none uppercase text-white placeholder-slate-500 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={scanMutation.isPending}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 text-sm"
            >
              {scanMutation.isPending ? 'Searching...' : 'Scan'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Handheld optical scanners configured in keyboard wedge mode will trigger scan automatically on Enter.
          </p>
        </form>

        {/* Scanned Product Card */}
        {scannedProduct && (
          <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
                  {scannedProduct.sku}
                </span>
                <h4 className="font-bold text-white text-base mt-1.5">{scannedProduct.name}</h4>
                {scannedProduct.description && (
                  <p className="text-xs text-slate-400 mt-0.5">{scannedProduct.description}</p>
                )}
              </div>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase border ${
                  scannedProduct.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {scannedProduct.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Cost Price</span>
                <span className="font-bold font-mono text-slate-200">${scannedProduct.costPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Sell Price</span>
                <span className="font-bold font-mono text-slate-200">${scannedProduct.sellPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Reorder Point</span>
                <span className="font-bold font-mono text-slate-200">{scannedProduct.reorderPoint} {scannedProduct.unit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Reorder Qty</span>
                <span className="font-bold font-mono text-slate-200">{scannedProduct.reorderQty} {scannedProduct.unit}</span>
              </div>
            </div>

            {/* Warehouse Stock Levels */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300 mb-2 block">Warehouse Availability:</span>
              <div className="space-y-1.5">
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
            className="px-5 py-2 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800/80 transition-colors text-sm"
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
    <div className="flex items-center justify-between text-xs bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
      <span className="text-slate-300 font-medium">{warehouseName}</span>
      <span className="font-bold font-mono text-cyan-400">
        {data !== undefined ? `${data.balance} on hand` : 'Checking...'}
      </span>
    </div>
  );
}
