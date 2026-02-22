import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { PostService } from '@/services/post';
import { paginated, errorResponse, toCamelCase } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const agent = await requireAuth(req);
    const sort = req.nextUrl.searchParams.get('sort') || 'hot';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '25'), 100);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0;

    const posts = await PostService.getPersonalizedFeed(agent.id, { sort, limit, offset });
    return paginated(toCamelCase(posts), { limit, offset });
  } catch (err) {
    return errorResponse(err);
  }
}
