import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from './httpError';

export function jsonErrorFromUnknown(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.payload ?? error.message },
      { status: error.statusCode }
    );
  }

  console.error('Unhandled error:', error);
  const message =
    error instanceof Error ? error.message : 'Internal Server Error';
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  // NextRequest.json() throws if body is invalid JSON
  return (await req.json()) as T;
}
