// ---------------------------------------------------------------------------
// Roles (RBAC)
// ---------------------------------------------------------------------------
export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  PROCUREMENT = 'PROCUREMENT',
  WAREHOUSE_STAFF = 'WAREHOUSE_STAFF',
  FINANCE = 'FINANCE',
  VIEWER = 'VIEWER',
}

// ---------------------------------------------------------------------------
// Purchase Order lifecycle
// ---------------------------------------------------------------------------
export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SENT = 'SENT',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

// Explicit transition map — this IS the state machine.
// The service layer must reject any transition not listed here.
// Never mutate `status` directly on a document; always go through
// PurchaseOrderService.transition(po, nextStatus).
export const PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  [PurchaseOrderStatus.DRAFT]: [PurchaseOrderStatus.PENDING_APPROVAL, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.PENDING_APPROVAL]: [
    PurchaseOrderStatus.APPROVED,
    PurchaseOrderStatus.REJECTED,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.APPROVED]: [PurchaseOrderStatus.SENT, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.REJECTED]: [PurchaseOrderStatus.DRAFT],
  [PurchaseOrderStatus.SENT]: [
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
    PurchaseOrderStatus.RECEIVED,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CLOSED],
  [PurchaseOrderStatus.RECEIVED]: [PurchaseOrderStatus.CLOSED],
  [PurchaseOrderStatus.CLOSED]: [],
  [PurchaseOrderStatus.CANCELLED]: [],
};

// ---------------------------------------------------------------------------
// Sales Order (outbound fulfillment) lifecycle
// ---------------------------------------------------------------------------
export enum SalesOrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PICKING = 'PICKING',
  PACKED = 'PACKED',
  PARTIALLY_SHIPPED = 'PARTIALLY_SHIPPED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export const SO_TRANSITIONS: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  [SalesOrderStatus.DRAFT]: [SalesOrderStatus.CONFIRMED, SalesOrderStatus.CANCELLED],
  [SalesOrderStatus.CONFIRMED]: [SalesOrderStatus.PICKING, SalesOrderStatus.CANCELLED],
  [SalesOrderStatus.PICKING]: [SalesOrderStatus.PACKED, SalesOrderStatus.CANCELLED],
  [SalesOrderStatus.PACKED]: [SalesOrderStatus.PARTIALLY_SHIPPED, SalesOrderStatus.SHIPPED],
  [SalesOrderStatus.PARTIALLY_SHIPPED]: [SalesOrderStatus.SHIPPED],
  [SalesOrderStatus.SHIPPED]: [SalesOrderStatus.DELIVERED],
  [SalesOrderStatus.DELIVERED]: [],
  [SalesOrderStatus.CANCELLED]: [],
};

// ---------------------------------------------------------------------------
// Stock ledger entry types — every stock mutation must be one of these
// ---------------------------------------------------------------------------
export enum LedgerEntryType {
  PO_RECEIPT = 'PO_RECEIPT',
  ORDER_PICK = 'ORDER_PICK',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}
