export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: string;
}

export interface Product {
  _id: string;
  sku: string;
  name: string;
  description?: string;
  unit: string;
  reorderPoint: number;
  reorderQty: number;
  costPrice: number;
  sellPrice: number;
  isActive: boolean;
}

export interface Alert {
  _id: string;
  type: 'LOW_STOCK' | 'EXPIRY_WARNING' | 'SLA_BREACH';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  severity: 'low' | 'medium' | 'high';
  message: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplierName: string;
  status: string;
  lines: Array<{
    productId: string;
    orderedQty: number;
    receivedQty: number;
    unitCost: number;
  }>;
  createdAt: string;
}

export interface SalesOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  lines: Array<{
    productId: string;
    orderedQty: number;
    pickedQty: number;
    shippedQty: number;
  }>;
  createdAt: string;
}

export interface StockBalance {
  productId: string;
  warehouseId: string;
  balance: number;
}

export interface Warehouse {
  _id: string;
  name: string;
  address?: string;
  isActive: boolean;
  binCount?: number;
  createdAt: string;
}

export interface Bin {
  _id: string;
  orgId: string;
  warehouseId: string;
  code: string;
  zone?: string;
  createdAt: string;
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  poApprovalThreshold: number;
  createdAt: string;
}
