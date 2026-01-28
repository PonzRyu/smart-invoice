/**
 * APIエラーを統一するためのエラー型
 * - statusCode: HTTPステータス
 * - payload: フロントが期待する { error: string | string[] } の中身
 */
export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly payload?: string | string[];

  constructor(statusCode: number, payload: string | string[], message?: string) {
    super(message ?? (Array.isArray(payload) ? payload.join('\n') : payload));
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export const badRequest = (payload: string | string[]) =>
  new HttpError(400, payload);
export const notFound = (payload: string | string[]) => new HttpError(404, payload);
export const conflict = (payload: string | string[]) => new HttpError(409, payload);

