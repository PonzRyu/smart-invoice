/**
 * 共通APIクライアント
 * fetch のラッパーとして、JSONパースとエラー処理を集約します。
 */

export interface ApiErrorPayload {
  error?: string | string[];
  message?: string;
}

/**
 * 共通のレスポンスハンドリング
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  let data: unknown = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      // JSONでない場合はそのまま進める
      data = null;
    }
  }

  if (!response.ok) {
    const payload = data as ApiErrorPayload | null;
    let message = 'サーバーとの通信に失敗しました。時間をおいて再度お試しください。';

    if (payload) {
      if (Array.isArray(payload.error)) {
        message = payload.error.join('\n');
      } else if (typeof payload.error === 'string') {
        message = payload.error;
      } else if (typeof payload.message === 'string') {
        message = payload.message;
      }
    }

    throw new Error(message);
  }

  // JSONではないレスポンスは T が unknown で扱われることを想定
  return data as T;
}

export async function getJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    method: 'GET',
  });
  return handleResponse<T>(response);
}

export async function postJson<TResponse, TBody>(
  url: string,
  body: TBody,
  init?: RequestInit
): Promise<TResponse> {
  const response = await fetch(url, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  return handleResponse<TResponse>(response);
}

export async function putJson<TResponse, TBody>(
  url: string,
  body: TBody,
  init?: RequestInit
): Promise<TResponse> {
  const response = await fetch(url, {
    ...init,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  return handleResponse<TResponse>(response);
}

export async function deleteRequest(
  url: string,
  init?: RequestInit
): Promise<void> {
  const response = await fetch(url, {
    ...init,
    method: 'DELETE',
  });
  await handleResponse<unknown>(response);
}

