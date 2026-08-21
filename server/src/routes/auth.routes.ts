import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for login endpoint (5 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const signupSchema = z.object({
  orgName: z.string().min(2).max(100),
  orgSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  userName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  orgSlug: z.string().min(2).max(50),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

/**
 * POST /auth/signup
 * Creates a new organization + first user (OWNER role)
 */
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = signupSchema.parse(req.body);
    const result = await AuthService.signup(data);
    res.status(201).json(result);
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
});

/**
 * POST /auth/login
 * Returns access token + refresh token
 */
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, orgSlug } = loginSchema.parse(req.body);

    // Look up org by slug first
    const { Organization } = await import('../models/Organization');
    const org = await Organization.findOne({ slug: orgSlug });

    if (!org) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const result = await AuthService.login(email, password, org._id);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      // Don't leak user existence
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/refresh
 * Rotates refresh token, returns new access + refresh tokens
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await AuthService.refresh(refreshToken);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * POST /auth/logout
 * Invalidates the refresh token
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await AuthService.logout(refreshToken);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
