import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { Organization } from './models/Organization';
import { User } from './models/User';
import { Warehouse } from './models/Warehouse';
import { Bin } from './models/Bin';
import { Product } from './models/Product';
import { StockLedgerEntry } from './models/StockLedgerEntry';
import { PurchaseOrder } from './models/PurchaseOrder';
import { SalesOrder } from './models/SalesOrder';
import { Alert, AlertType, AlertStatus } from './models/Alert';
import { AuditLog } from './models/AuditLog';
import {
  Role,
  PurchaseOrderStatus,
  SalesOrderStatus,
  LedgerEntryType,
} from './types/enums';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tally';

async function seed() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected. Beginning database seed...');

  const orgSlug = 'apex-logistics';

  // Find or cleanup existing apex-logistics org
  const existingOrg = await Organization.findOne({ slug: orgSlug });
  if (existingOrg) {
    console.log(`Cleaning existing records for organization: ${orgSlug}`);
    const orgId = existingOrg._id;
    await Promise.all([
      User.deleteMany({ orgId }),
      Warehouse.deleteMany({ orgId }),
      Bin.deleteMany({ orgId }),
      Product.deleteMany({ orgId }),
      StockLedgerEntry.deleteMany({ orgId }),
      PurchaseOrder.deleteMany({ orgId }),
      SalesOrder.deleteMany({ orgId }),
      Alert.deleteMany({ orgId }),
      AuditLog.deleteMany({ orgId }),
    ]);
    await Organization.deleteOne({ _id: orgId });
  }

  // 1. Organization
  const org = await Organization.create({
    name: 'Apex Logistics Global',
    slug: orgSlug,
    poApprovalThreshold: 10000,
  });
  console.log(`Created Organization: ${org.name} (${org.slug})`);

  // 2. Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const adminUser = await User.create({
    orgId: org._id,
    name: 'Alex Mercer',
    email: 'admin@apex.com',
    passwordHash,
    role: Role.OWNER,
    isActive: true,
  });

  const staffUser = await User.create({
    orgId: org._id,
    name: 'Marcus Vance',
    email: 'marcus.warehouse@apex.com',
    passwordHash,
    role: Role.WAREHOUSE_STAFF,
    isActive: true,
  });
  console.log(`Created Users: ${adminUser.email} (OWNER), ${staffUser.email} (WAREHOUSE_STAFF)`);

  // 3. Warehouses
  const centralWarehouse = await Warehouse.create({
    orgId: org._id,
    name: 'Central Distribution Hub',
    address: '100 Logistics Blvd, Chicago, IL 60601',
    isActive: true,
  });

  const pacificWarehouse = await Warehouse.create({
    orgId: org._id,
    name: 'Pacific Gateway Warehouse',
    address: '500 Harbor Dr, Long Beach, CA 90802',
    isActive: true,
  });
  console.log(`Created Warehouses: ${centralWarehouse.name}, ${pacificWarehouse.name}`);

  // 4. Bins
  const binA1 = await Bin.create({
    orgId: org._id,
    warehouseId: centralWarehouse._id,
    code: 'A-01-01',
    zone: 'Aisle A - High Value Electronics',
  });

  const binA2 = await Bin.create({
    orgId: org._id,
    warehouseId: centralWarehouse._id,
    code: 'A-01-02',
    zone: 'Aisle A - Displays & Peripherals',
  });

  const binB1 = await Bin.create({
    orgId: org._id,
    warehouseId: centralWarehouse._id,
    code: 'B-02-01',
    zone: 'Aisle B - Heavy Furniture & Racks',
  });

  const binCold = await Bin.create({
    orgId: org._id,
    warehouseId: centralWarehouse._id,
    code: 'COLD-01',
    zone: 'Cold Chain Vault (2-8°C)',
  });

  await Bin.create({
    orgId: org._id,
    warehouseId: pacificWarehouse._id,
    code: 'W-01-01',
    zone: 'Receiving Dock',
  });
  console.log('Created Bins: A-01-01, A-01-02, B-02-01, COLD-01, W-01-01');

  // 5. Products
  const pLaptop = await Product.create({
    orgId: org._id,
    sku: 'SKU-LAPTOP-PRO',
    name: 'TitanBook Pro 15',
    description: 'High-performance workstation laptop (Core i9, 32GB RAM)',
    unit: 'pcs',
    reorderPoint: 15,
    reorderQty: 50,
    costPrice: 950,
    sellPrice: 1499,
    isActive: true,
  });

  const pMonitor = await Product.create({
    orgId: org._id,
    sku: 'SKU-MONITOR-4K',
    name: 'UltraView 27" 4K Monitor',
    description: '3840x2160 IPS factory-calibrated color display',
    unit: 'pcs',
    reorderPoint: 20,
    reorderQty: 40,
    costPrice: 220,
    sellPrice: 380,
    isActive: true,
  });

  const pKeyboard = await Product.create({
    orgId: org._id,
    sku: 'SKU-KEYBOARD-MEC',
    name: 'KeyCraft Pro Mechanical Keyboard',
    description: 'Low-latency wireless mechanical keyboard with hot-swap switches',
    unit: 'pcs',
    reorderPoint: 30,
    reorderQty: 60,
    costPrice: 45,
    sellPrice: 89,
    isActive: true,
  });

  const pDock = await Product.create({
    orgId: org._id,
    sku: 'SKU-USB-C-DOCK',
    name: 'Universal 12-in-1 USB-C Hub',
    description: 'Dual HDMI, Ethernet, 100W PD pass-through dock',
    unit: 'pcs',
    reorderPoint: 25,
    reorderQty: 50,
    costPrice: 55,
    sellPrice: 110,
    isActive: true,
  });

  const pChair = await Product.create({
    orgId: org._id,
    sku: 'SKU-ERGONOMIC-CHAIR',
    name: 'AeroMesh Ergonomic Task Chair',
    description: 'Adjustable lumbar support ergonomic executive chair',
    unit: 'pcs',
    reorderPoint: 10,
    reorderQty: 25,
    costPrice: 180,
    sellPrice: 349,
    isActive: true,
  });

  const pSensors = await Product.create({
    orgId: org._id,
    sku: 'SKU-MED-SENSORS',
    name: 'BioTemp ThermoSensors (Cold Chain)',
    description: 'Precision temperature data loggers for cold storage items',
    unit: 'box',
    reorderPoint: 50,
    reorderQty: 100,
    costPrice: 35,
    sellPrice: 75,
    isActive: true,
  });
  console.log('Created 6 Products with SKUs and reorder rules');

  // 6. Initial Stock Ledger Entries
  const dummyPoRef = new Types.ObjectId();
  const expNear = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000); // 12 days (near expiry!)
  const expFar = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const initialStock = [
    {
      product: pLaptop,
      warehouse: centralWarehouse,
      bin: binA1,
      qty: 60,
      batch: 'BATCH-LP-2026',
      exp: expFar,
    },
    {
      product: pMonitor,
      warehouse: centralWarehouse,
      bin: binA2,
      qty: 45,
      batch: 'BATCH-MN-2026',
      exp: expFar,
    },
    {
      product: pKeyboard,
      warehouse: centralWarehouse,
      bin: binA2,
      qty: 80,
      batch: 'BATCH-KB-2026',
      exp: undefined,
    },
    {
      product: pDock,
      warehouse: centralWarehouse,
      bin: binA1,
      qty: 50,
      batch: 'BATCH-DK-2026',
      exp: undefined,
    },
    {
      product: pChair,
      warehouse: centralWarehouse,
      bin: binB1,
      qty: 6, // Low stock: balance 6 vs reorderPoint 10
      batch: 'BATCH-CH-2026',
      exp: undefined,
    },
    {
      product: pSensors,
      warehouse: centralWarehouse,
      bin: binCold,
      qty: 120,
      batch: 'LOT-BIO-2026-09',
      exp: expNear, // Expires in 12 days
    },
  ];

  for (const s of initialStock) {
    await StockLedgerEntry.create({
      orgId: org._id,
      productId: s.product._id,
      warehouseId: s.warehouse._id,
      binId: s.bin._id,
      type: LedgerEntryType.PO_RECEIPT,
      quantityChange: s.qty,
      balanceAfter: s.qty,
      batchNumber: s.batch,
      expiryDate: s.exp,
      referenceType: 'PurchaseOrder',
      referenceId: dummyPoRef,
      createdBy: adminUser._id,
    });
  }
  console.log('Seeded Stock Ledger entries (including low-stock and near-expiry items)');

  // 7. Alerts
  await Alert.create({
    orgId: org._id,
    type: AlertType.LOW_STOCK,
    status: AlertStatus.ACTIVE,
    severity: 'high',
    message: `Low Stock Alert: AeroMesh Ergonomic Task Chair (${pChair.sku}) balance is 6 (Reorder point: 10)`,
    metadata: {
      productId: pChair._id,
      sku: pChair.sku,
      currentBalance: 6,
      reorderPoint: 10,
    },
  });

  await Alert.create({
    orgId: org._id,
    type: AlertType.EXPIRY_WARNING,
    status: AlertStatus.ACTIVE,
    severity: 'medium',
    message: `Expiry Warning: BioTemp ThermoSensors (${pSensors.sku}) batch LOT-BIO-2026-09 expires in 12 days`,
    metadata: {
      productId: pSensors._id,
      sku: pSensors.sku,
      batchNumber: 'LOT-BIO-2026-09',
      expiryDate: expNear,
    },
  });
  console.log('Created initial Low Stock and Expiry alerts');

  // 8. Purchase Orders
  // PO 1: Approved - ready to receive
  const po1 = await PurchaseOrder.create({
    orgId: org._id,
    poNumber: 'PO-2026-001',
    supplierName: 'Global Microchips & Tech Co.',
    warehouseId: centralWarehouse._id,
    status: PurchaseOrderStatus.APPROVED,
    lines: [
      {
        productId: pLaptop._id,
        orderedQty: 10,
        receivedQty: 0,
        unitCost: 950,
      },
      {
        productId: pDock._id,
        orderedQty: 20,
        receivedQty: 0,
        unitCost: 55,
      },
    ],
    requiresApprovalAbove: 10000,
    createdBy: adminUser._id,
    approvedBy: adminUser._id,
  });

  // PO 2: Pending Approval (Total: $17,600 > $10,000 threshold)
  const po2 = await PurchaseOrder.create({
    orgId: org._id,
    poNumber: 'PO-2026-002',
    supplierName: 'DisplayTech International',
    warehouseId: centralWarehouse._id,
    status: PurchaseOrderStatus.PENDING_APPROVAL,
    lines: [
      {
        productId: pMonitor._id,
        orderedQty: 80,
        receivedQty: 0,
        unitCost: 220,
      },
    ],
    requiresApprovalAbove: 10000,
    createdBy: staffUser._id,
  });
  console.log(`Created Purchase Orders: ${po1.poNumber} (APPROVED), ${po2.poNumber} (PENDING_APPROVAL)`);

  // 9. Sales Orders
  // SO 1: Confirmed - ready for picking
  const so1 = await SalesOrder.create({
    orgId: org._id,
    orderNumber: 'SO-2026-101',
    customerName: 'OmniTech Enterprise Systems',
    warehouseId: centralWarehouse._id,
    status: SalesOrderStatus.CONFIRMED,
    lines: [
      {
        productId: pLaptop._id,
        orderedQty: 4,
        pickedQty: 0,
        shippedQty: 0,
      },
      {
        productId: pKeyboard._id,
        orderedQty: 8,
        pickedQty: 0,
        shippedQty: 0,
      },
    ],
    createdBy: adminUser._id,
  });

  // SO 2: Picking - partially picked, ready for shipping
  const so2 = await SalesOrder.create({
    orgId: org._id,
    orderNumber: 'SO-2026-102',
    customerName: 'Summit Media Group',
    warehouseId: centralWarehouse._id,
    status: SalesOrderStatus.PICKING,
    lines: [
      {
        productId: pMonitor._id,
        orderedQty: 3,
        pickedQty: 3,
        shippedQty: 0,
      },
    ],
    createdBy: adminUser._id,
  });

  // SO 3: Shipped
  const so3 = await SalesOrder.create({
    orgId: org._id,
    orderNumber: 'SO-2026-103',
    customerName: 'Vanguard Systems',
    warehouseId: centralWarehouse._id,
    status: SalesOrderStatus.SHIPPED,
    lines: [
      {
        productId: pDock._id,
        orderedQty: 2,
        pickedQty: 2,
        shippedQty: 2,
      },
    ],
    createdBy: adminUser._id,
  });
  console.log(`Created Sales Orders: ${so1.orderNumber} (CONFIRMED), ${so2.orderNumber} (PICKING), ${so3.orderNumber} (SHIPPED)`);

  // 10. Initial Audit Log
  await AuditLog.create({
    orgId: org._id,
    userId: adminUser._id,
    action: 'ORGANIZATION_INITIALIZED',
    entityType: 'Organization',
    entityId: org._id,
    details: {
      name: org.name,
      slug: org.slug,
      seedVersion: '1.0.0',
    },
  });

  console.log('\n=============================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('=============================================');
  console.log('Organization:  Apex Logistics Global');
  console.log('Org Slug:      apex-logistics');
  console.log('Admin User:    admin@apex.com');
  console.log('Staff User:    marcus.warehouse@apex.com');
  console.log('Password:      Password123!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
