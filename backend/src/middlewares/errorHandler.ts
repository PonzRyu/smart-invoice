import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/httpError';

/**
 * 共通エラーハンドラ
 * - フロントが扱いやすい { error: string | string[] } 形式を維持
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.payload ?? err.message });
  }

  console.error('Unhandled error:', err);
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  return res.status(500).json({ error: message });
};

