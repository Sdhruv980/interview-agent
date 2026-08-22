import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /api/health
 * Public health-check — used by Render, load balancers, uptime monitors
 */
router.get('/', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    message: 'Interview Agent API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV ?? 'development',
    database: {
      status: dbStatus[dbState] ?? 'unknown',
    },
    version: process.env.npm_package_version ?? '1.0.0',
  });
});

export default router;
