import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { SearchService } from '@/services/search';
import { success, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const q = req.nextUrl.searchParams.get('q') || '';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '25'), 100);

    const results = await SearchService.search(q, { limit });
    return success(results);
  } catch (err) {
    return errorResponse(err);
  }
}
