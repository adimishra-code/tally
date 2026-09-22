import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Product } from '../types';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Action' | 'SKU';
  title: string;
  subtitle?: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTriggerScanner?: () => void;
}

export default function CommandPaletteModal({ isOpen, onClose, onTriggerScanner }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch products for quick SKU search
  const { data: products } = useQuery<Product[]>({
    queryKey: ['products-search-palette', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data } = await api.get(`/products?search=${encodeURIComponent(query)}`);
      return data;
    },
    enabled: isOpen && query.trim().length >= 2,
    staleTime: 30000,
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const baseItems: CommandItem[] = [
    // Navigation items
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Operations Command',
      subtitle: 'Real-time telemetry, KPIs and fulfillment velocity',
      icon: '📊',
      shortcut: 'G D',
      action: () => {
        navigate('/');
        onClose();
      },
    },
    {
      id: 'nav-inventory',
      category: 'Navigation',
      title: 'Stock Ledger',
      subtitle: 'Multi-warehouse derived balances and mutations',
      icon: '📦',
      shortcut: 'G I',
      action: () => {
        navigate('/inventory');
        onClose();
      },
    },
    {
      id: 'nav-products',
      category: 'Navigation',
      title: 'Product Catalog',
      subtitle: 'SKU registry, pricing, and reorder levels',
      icon: '🏷️',
      shortcut: 'G P',
      action: () => {
        navigate('/products');
        onClose();
      },
    },
    {
      id: 'nav-pos',
      category: 'Navigation',
      title: 'Purchase Orders',
      subtitle: 'Inbound procurement lifecycle and receipts',
      icon: '📥',
      shortcut: 'G O',
      action: () => {
        navigate('/purchase-orders');
        onClose();
      },
    },
    {
      id: 'nav-sos',
      category: 'Navigation',
      title: 'Sales Orders',
      subtitle: 'Fulfillment queue, picking and shipments',
      icon: '🚚',
      shortcut: 'G S',
      action: () => {
        navigate('/sales-orders');
        onClose();
      },
    },
    {
      id: 'nav-warehouses',
      category: 'Navigation',
      title: 'Warehouses & Bins',
      subtitle: 'Facility zones, racks, and storage topologies',
      icon: '🏢',
      shortcut: 'G W',
      action: () => {
        navigate('/warehouses');
        onClose();
      },
    },
    {
      id: 'nav-alerts',
      category: 'Navigation',
      title: 'Alerts Desk',
      subtitle: 'Low stock, expiry notices, and SLA anomalies',
      icon: '🔔',
      shortcut: 'G A',
      action: () => {
        navigate('/alerts');
        onClose();
      },
    },
    {
      id: 'nav-audit',
      category: 'Navigation',
      title: 'Audit Log Trail',
      subtitle: 'Immutable record of system transitions and actions',
      icon: '🛡️',
      shortcut: 'G L',
      action: () => {
        navigate('/audit');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'Tenant Settings & Telemetry',
      subtitle: 'Org thresholds, system diagnostics, and policies',
      icon: '⚙️',
      shortcut: 'G T',
      action: () => {
        navigate('/settings');
        onClose();
      },
    },

    // Action items
    {
      id: 'act-scan',
      category: 'Action',
      title: 'Quick Barcode Scanner',
      subtitle: 'Scan SKU with simulated hardware beam',
      icon: '⚡',
      shortcut: 'SCAN',
      action: () => {
        onClose();
        if (onTriggerScanner) onTriggerScanner();
      },
    },
    {
      id: 'act-new-po',
      category: 'Action',
      title: 'Draft Purchase Order',
      subtitle: 'Initiate inbound supplier procurement order',
      icon: '➕',
      action: () => {
        navigate('/purchase-orders');
        onClose();
      },
    },
    {
      id: 'act-new-so',
      category: 'Action',
      title: 'Create Sales Order',
      subtitle: 'Register outbound customer shipment order',
      icon: '➕',
      action: () => {
        navigate('/sales-orders');
        onClose();
      },
    },
    {
      id: 'act-adjust-stock',
      category: 'Action',
      title: 'Stock Ledger Adjustment',
      subtitle: 'Write an auditable stock count adjustment',
      icon: '📝',
      action: () => {
        navigate('/inventory');
        onClose();
      },
    },
  ];

  // Map products to command items
  const productItems: CommandItem[] = (products || []).slice(0, 5).map((p) => ({
    id: `sku-${p._id}`,
    category: 'SKU',
    title: `${p.sku} — ${p.name}`,
    subtitle: `Unit: ${p.unit} • Cost: $${(p.costPrice || 0).toFixed(2)} • Sell: $${(p.sellPrice || 0).toFixed(2)}`,
    icon: '📦',
    action: () => {
      navigate('/products');
      onClose();
    },
  }));

  // Filter items based on query
  const q = query.toLowerCase().trim();
  const filteredItems = [
    ...baseItems.filter(
      (item) =>
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    ),
    ...productItems,
  ];

  // Key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keep selected item visible in view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#0E1014] border border-[#2D333F] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 border-b border-[#232730] bg-[#12151B]">
          <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, route, or SKU code... (e.g. 'inventory', 'SO', 'scan')"
            className="w-full px-3 py-3.5 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded border border-[#232730] mr-2"
            >
              CLEAR
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-[#171A22] border border-[#2B303C] rounded shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Command List Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2 space-y-1 divide-y divide-[#171A21]">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <span className="text-2xl">🔍</span>
              <p className="text-xs font-mono text-zinc-400">NO COMMANDS OR SKUS MATCHED // "{query}"</p>
              <p className="text-[11px] text-zinc-500">Try searching for 'products', 'ledger', 'orders', or an exact SKU.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3.5 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                    isSelected
                      ? 'bg-amber-500/10 border border-amber-500/30 text-zinc-100'
                      : 'hover:bg-[#14171E] border border-transparent text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isSelected ? 'text-amber-400' : 'text-zinc-200'}`}>
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#171B22] border border-[#252A36] text-zinc-400 uppercase">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 bg-[#161921] border border-[#252A36] rounded">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <span className="text-amber-400 text-xs font-mono">&crarr;</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Hotkey Guide */}
        <div className="px-4 py-2 bg-[#0B0D11] border-t border-[#1F232C] flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.2 bg-[#14171F] border border-[#272B36] rounded text-[10px] text-zinc-400">&uarr;</kbd>
              <kbd className="px-1.5 py-0.2 bg-[#14171F] border border-[#272B36] rounded text-[10px] text-zinc-400">&darr;</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.2 bg-[#14171F] border border-[#272B36] rounded text-[10px] text-zinc-400">&crarr;</kbd>
              Select
            </span>
          </div>
          <span className="text-zinc-500">TALLY // COMMAND PALETTE</span>
        </div>
      </div>
    </div>
  );
}
