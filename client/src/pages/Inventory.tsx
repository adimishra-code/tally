import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function Inventory() {
  const [warehouseId, setWarehouseId] = useState<string>('');

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data } = await api.get('/warehouses');
      return data;
    },
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', warehouseId],
    queryFn: async () => {
      if (!warehouseId) return [];
      const { data } = await api.get(`/stock/warehouse/${warehouseId}`);
      return data;
    },
    enabled: !!warehouseId,
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Inventory</h2>
          <p className="text-gray-600">Real-time stock levels across warehouses</p>
        </div>
      </div>

      {/* Warehouse Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Warehouse</label>
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Choose a warehouse...</option>
          {warehouses?.map((wh: any) => (
            <option key={wh._id} value={wh._id}>
              {wh.name}
            </option>
          ))}
        </select>
      </div>

      {/* Inventory Table */}
      {warehouseId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Loading inventory...
                    </td>
                  </tr>
                ) : inventory?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No inventory found for this warehouse
                    </td>
                  </tr>
                ) : (
                  inventory?.map((item: any) => {
                    const isLow = item.balance <= 10;
                    const isEmpty = item.balance === 0;
                    return (
                      <tr key={item.productId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <code className="text-sm font-mono text-gray-900">{item.sku}</code>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.unit}</td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`text-lg font-bold ${
                              isEmpty ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'
                            }`}
                          >
                            {item.balance}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isEmpty ? (
                            <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded uppercase">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-800 rounded uppercase">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 rounded uppercase">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(item.lastUpdated).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
