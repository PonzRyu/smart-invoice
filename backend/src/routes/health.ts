import { Router } from 'express';

export const healthRouter = Router();

// Health check endpoint
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Smart Invoice Backend API is running' });
});

