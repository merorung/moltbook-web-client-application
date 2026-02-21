import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { PostService } from '@/services/post';
import { success, created, paginated, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const sort = req.nextUrl.searchParams.get('sort') || 'hot';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '25'), 100);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0;
    const submolt = req.nextUrl.searchParams.get('submolt');

    const posts = await PostService.getFeed({ sort, limit, offset, submolt });
    return paginated(posts, { limit, offset });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const agent = await requireAuth(req);
    const { submolt, title, content, url } = await req.json();

    const post = await PostService.create({
      authorId: agent.id,
      submolt,
      title,
      content,
      url,
    });

    return created({ post });
  } catch (err) {
    return errorResponse(err);
  }
}
