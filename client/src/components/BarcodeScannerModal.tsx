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
    mutationFn: async (code: string) => {
      try {
        const res = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
        return res.data;
      } catch (e) {
        // Fallback to receiving barcode-lookup
        const res = await api.post('/receiving/barcode-lookup', { barcode: code });
        return res.data;
      }
    },
    onSuccess: (data) => {
      setScannedProduct(data);
      toast.success(`Found SKU: ${data.sku}`);
    },
    onError: () => {
      toast.error(`No catalog match found for "${barcode}"`);
      setScannedProduct(null);
    },
  });

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    scanMutation.mutate(barcode.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#0E1014] border border-[#2B303C] rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 text-zinc-100 relative">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#232730] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 led-pulse-amber" />
            <h3 className="text-sm font-bold text-zinc-100 tracking-tight font-mono uppercase">
              Optical Barcode & SKU Scanner
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded hover:bg-[#1A1E26] transition-colors font-mono text-xs"
          >
            [ESC]
          </button>
        </div>

        {/* Viewfinder Graphic (Rugged Handheld HUD) */}
        <div className="relative h-20 bg-[#090A0C] border border-[#232730] rounded-lg overflow-hidden flex items-center justify-center">
          <div className="absolute inset-x-0 h-0.5 bg-amber-500/80 scan-laser shadow-sm shadow-amber-500" />
          <div className="text-center font-mono text-[10px] text-zinc-500 space-y-0.5 pointer-events-none">
            <span className="text-amber-400/80 font-bold block">LASER OPTIC ENGAGED</span>
            <span>READY FOR KEYBOARD-WEDGE OR MANUAL INPUT</span>
          </div>
          {/* Corner Viewfinder Marks */}
          <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-500/70" />
          <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-500/70" />
          <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-500/70" />
          <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-500/70" />
        </div>

        {/* Scan Input Form */}
        <form onSubmit={handleScanSubmit} className="space-y-2.5">
          <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            BARCODE_PAYLOAD // SKU_NUMBER
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.toUpperCase())}
                placeholder="e.g. SKU-PROD-001"
                className="w-full px-3.5 py-2 font-mono font-bold bg-[#12141A] border border-[#262B35] rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none uppercase text-zinc-100 placeholder-zinc-600 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={scanMutation.isPending}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-mono font-bold rounded-lg transition-all shadow-xs disabled:opacity-50 text-xs btn-tactile"
            >
              {scanMutation.isPending ? 'QUERYING...' : 'RESOLVE'}
            </button>
          </div>
        </form>

        {/* Scanned Product Card */}
        {scannedProduct && (
          <div className="bg-[#12141A] border border-[#262B35] rounded-lg p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold bg-[#1C2028] text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                  {scannedProduct.sku}
                </span>
                <h4 className="font-bold text-zinc-100 text-sm mt-1.5">{scannedProduct.name}</h4>
                {scannedProduct.description && (
                  <p className="text-xs text-zinc-400 mt-0.5">{scannedProduct.description}</p>
                )}
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${
                  scannedProduct.isActive
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {scannedProduct.isActive ? 'ACTIVE' : 'ARCHIVED'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-[#1F232B] text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Cost</span>
                <span className="font-bold text-zinc-200">${scannedProduct.costPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Sell</span>
                <span className="font-bold text-zinc-200">${scannedProduct.sellPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Reorder Pt</span>
                <span className="font-bold text-zinc-200">{scannedProduct.reorderPoint} {scannedProduct.unit}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Reorder Qty</span>
                <span className="font-bold text-zinc-200">{scannedProduct.reorderQty} {scannedProduct.unit}</span>
              </div>
            </div>

            {/* Warehouse Stock Levels */}
            <div className="pt-2.5 border-t border-[#1F232B]">
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-400 mb-2 block">
                Facility Stock Telemetry:
              </span>
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

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-[#262B35] text-zinc-400 hover:text-zinc-100 hover:bg-[#161922] font-mono font-medium rounded-lg transition-colors text-xs"
          >
            DISMISS
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
    <div className="flex items-center justify-between text-xs bg-[#090A0C] px-3 py-1.5 rounded border border-[#1F232B]">
      <span className="text-zinc-300 font-medium">{warehouseName}</span>
      <span className="font-bold font-mono text-amber-400">
        {data !== undefined ? `${data.balance} units` : '...'}
      </span>
    </div>
  );
}
