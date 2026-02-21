/**
 * Response helpers for Next.js API routes
 */

import { NextResponse } from 'next/server';
import { ApiError } from './errors';

export function success(data: Record<string, unknown>, statusCode = 200) {
  return NextResponse.json({ success: true, ...data }, { status: statusCode });
}

export function created(data: Record<string, unknown>) {
  return success(data, 201);
}

export function paginated(items: unknown[], pagination: { limit: number; offset: number }) {
  return success({
    data: items,
    pagination: {
      count: items.length,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: items.length === pagination.limit,
    },
  });
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(err.toJSON(), { status: err.statusCode });
  }

  console.error('Unhandled error:', err);
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
