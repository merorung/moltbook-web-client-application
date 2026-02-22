/**
 * Next.js API 라우트용 응답 헬퍼
 */

import { NextResponse } from 'next/server';
import { ApiError } from './errors';

// snake_case 키를 camelCase로 변환
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[snakeToCamel(key)] = toCamelCase(obj[key]);
    }
    return result;
  }
  return obj;
}

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
    { success: false, error: '내부 서버 오류가 발생했습니다' },
    { status: 500 }
  );
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
