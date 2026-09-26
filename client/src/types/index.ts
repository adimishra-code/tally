export interface User {
  id?: string;
  _id?: string;
  orgId: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface Alert {
  _id: string;
  type: 'LOW_STOCK' | 'EXPIRY_WARNING' | 'SLA_BREACH';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  severity: 'low' | 'medium' | 'high';
  message: string;
  metadata: Record<string, any>;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: { _id: string; name: string; email: string };
}

export interface PurchaseOrderLine {
  productId: any;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplierName: string;
  status: string;
  lines: PurchaseOrderLine[];
  totalAmount?: number;
  warehouseId?: any;
  notes?: string;
  approvedBy?: any;
  approvedAt?: string;
  createdBy?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface SalesOrderLine {
  productId: any;
  orderedQty: number;
  pickedQty: number;
  shippedQty: number;
}

export interface SalesOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  warehouseId?: any;
  lines: SalesOrderLine[];
  createdBy?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface ShipmentLine {
  productId: any;
  shippedQty: number;
}

export interface Shipment {
  _id: string;
  orgId: string;
  salesOrderId: string;
  carrier?: string;
  trackingNumber?: string;
  lines: ShipmentLine[];
  shippedBy?: { _id: string; name: string; email: string };
  shippedAt?: string;
  createdAt: string;
}

export interface StockLedgerEntry {
  _id: string;
  orgId: string;
  productId: any;
  warehouseId: any;
  binId?: any;
  type: string;
  quantityChange: number;
  balanceAfter: number;
  batchNumber?: string;
  expiryDate?: string;
  referenceType: 'PurchaseOrder' | 'SalesOrder' | 'Adjustment' | 'Transfer';
  referenceId: string;
  createdBy: any;
  createdAt: string;
}

export interface AuditLogEntry {
  _id: string;
  orgId: string;
  userId: { _id: string; name: string; email: string; role?: string };
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ip?: string;
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
