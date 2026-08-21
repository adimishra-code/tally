import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/enums';
import { Product } from '../models/Product';

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

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json(products);
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

      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, orgId: authReq.orgId },
        { $set: data },
        { new: true, runValidators: true }
      );

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

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

      res.json({ message: 'Product deactivated', product });
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
