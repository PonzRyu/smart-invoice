import express from 'express';
import cors from 'cors';

import { healthRouter } from './routes/health';
import { customersRouter } from './routes/customers';
import { invoicesRouter } from './routes/invoices';
import { errorHandler } from './middlewares/errorHandler';

/**
 * Expressアプリ生成
 * - ミドルウェア
 * - ルーティング
 * - 共通エラーハンドラ
 */
export function createApp() {
  const app = express();

  // Middleware
  // CORS設定：すべてのオリジンを許可（本番環境では適切なオリジンを指定することを推奨）
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Routes
  app.use('/', healthRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/invoices', invoicesRouter);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}

