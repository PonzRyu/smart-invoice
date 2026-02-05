import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express用のasyncハンドラ
 * try/catch を各コントローラに書かないためのラッパーです。
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

