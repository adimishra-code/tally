import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/enums';
import { Product } from '../models/Product';
import { AuditLog } from '../models/AuditLog';

const router = Router();

const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  unit: z.string().default('pcs'),
  reorderPoint: z.number().min(0).default(0),
  reorderQty: z.number().min(0).default(0),
  costPrice: z.number().min(0),
  sellPrice: z.number().min(0),
});

const updateProductSchema = createProductSchema.partial();

/**
 * POST /products - Create a new product
 * Requires PROCUREMENT, ADMIN, or OWNER role
 */
router.post(
  '/',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.PROCUREMENT),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const data = createProductSchema.parse(req.body);

      // Check if SKU already exists in this org
      const existing = await Product.findOne({ orgId: authReq.orgId, sku: data.sku });
      if (existing) {
        res.status(400).json({ error: 'SKU already exists in this organization' });
        return;
      }

      const product = await Product.create({
        orgId: authReq.orgId,
        ...data,
      });

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'PRODUCT_CREATED',
        entityType: 'Product',
        entityId: product._id,
        before: {},
        after: {
          sku: product.sku,
          name: product.name,
          costPrice: product.costPrice,
          sellPrice: product.sellPrice,
        },
      });

      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /products - List all products (org-scoped)
 * All authenticated users can read
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { isActive, search } = req.query;

    const filter: any = { orgId: authReq.orgId };

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search && typeof search === 'string') {
      filter.$or = [
        { sku: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /products/export - Export product catalog to CSV
 */
router.get(['/export', '/export/csv'], requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const products = await Product.find({ orgId: authReq.orgId }).sort({ sku: 1 }).lean();

    const headers = [
      'SKU',
      'Product Name',
      'Unit',
      'Cost Price',
      'Sell Price',
      'Reorder Point',
      'Reorder Quantity',
      'Active Status',
      'Description',
    ];

    const rows = products.map((p) => [
      `"${p.sku.replace(/"/g, '""')}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.unit || 'pcs'}"`,
      `${(p.costPrice || 0).toFixed(2)}`,
      `${(p.sellPrice || 0).toFixed(2)}`,
      `${p.reorderPoint || 0}`,
      `${p.reorderQty || 0}`,
      `"${p.isActive ? 'ACTIVE' : 'ARCHIVED'}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tally-products-catalog-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting products:', error);
    res.status(500).json({ error: 'Internal server error during product export' });
  }
});

/**
 * GET /products/barcode/:code or /products/scan/:code - High-speed barcode / SKU lookup
 */
router.get(['/barcode/:code', '/scan/:code'], requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const code = req.params.code.trim();

    // Look up by SKU case-insensitively or exact
    const product = await Product.findOne({
      orgId: authReq.orgId,
      sku: { $regex: new RegExp(`^${code}$`, 'i') },
    });

    if (!product) {
      res.status(404).json({ error: `Product with barcode or SKU "${code}" not found` });
      return;
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /products/:id - Get a single product
 */
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const product = await Product.findOne({
      _id: req.params.id,
      orgId: authReq.orgId,
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /products/:id - Update a product
 * Requires PROCUREMENT, ADMIN, or OWNER role
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.PROCUREMENT),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const data = updateProductSchema.parse(req.body);

      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const previous = await Product.findOne({ _id: req.params.id, orgId: authReq.orgId });
      if (!previous) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, orgId: authReq.orgId },
        { $set: data },
        { new: true, runValidators: true }
      );

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: product._id,
        before: {
          name: previous.name,
          costPrice: previous.costPrice,
          sellPrice: previous.sellPrice,
          reorderPoint: previous.reorderPoint,
        },
        after: data,
      });

      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /products/:id - Soft delete (mark inactive)
 * Requires ADMIN or OWNER role
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;

      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, orgId: authReq.orgId },
        { $set: { isActive: false } },
        { new: true }
      );

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'PRODUCT_DEACTIVATED',
        entityType: 'Product',
        entityId: product._id,
        before: { isActive: true },
        after: { isActive: false },
      });

      res.json({ message: 'Product deactivated', product });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


/**
 * POST /products/import/csv - Bulk import products
 */
router.post(
  '/import/csv',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.PROCUREMENT),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const items = z.array(createProductSchema).min(1).parse(req.body);

      let created = 0;
      let skipped = 0;

      for (const item of items) {
        const existing = await Product.findOne({
          orgId: authReq.orgId,
          sku: item.sku.toUpperCase(),
        });

        if (existing) {
          skipped++;
        } else {
          await Product.create({
            orgId: authReq.orgId,
            ...item,
            sku: item.sku.toUpperCase(),
          });
          created++;
        }
      }

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'PRODUCTS_BULK_IMPORTED',
        entityType: 'Product',
        entityId: authReq.orgId,
        before: {},
        after: { created, skipped },
      });

      res.json({
        message: `Imported ${created} product(s), skipped ${skipped} existing.`,
        created,
        skipped,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /products/:id/toggle-active - Toggle active/inactive status
 */
router.patch(
  '/:id/toggle-active',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.PROCUREMENT),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;

      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const product = await Product.findOne({ _id: req.params.id, orgId: authReq.orgId });
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const previousStatus = product.isActive;
      product.isActive = !product.isActive;
      await product.save();

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'PRODUCT_STATUS_TOGGLED',
        entityType: 'Product',
        entityId: product._id,
        before: { isActive: previousStatus },
        after: { isActive: product.isActive },
      });

      res.json({ message: `Product ${product.isActive ? 'activated' : 'deactivated'}`, product });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /products/sku/:sku - Lookup by SKU (for barcode scanning)
 */
router.get('/sku/:sku', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    const product = await Product.findOne({
      orgId: authReq.orgId,
      sku: req.params.sku.toUpperCase(),
      isActive: true,
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
