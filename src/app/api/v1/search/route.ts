import { NextRequest } from 'next/server';
import { optionalAuth } from '@/lib/auth-middleware';
import { SearchService } from '@/services/search';
import { success, errorResponse, toCamelCase } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || '';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '25'), 100);

    const results = await SearchService.search(q, { limit });
    return success(toCamelCase(results));
  } catch (err) {
    return errorResponse(err);
  }
}
