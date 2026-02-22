import { NextRequest } from 'next/server';
import { requireClaimed } from '@/lib/auth-middleware';
import { PostService } from '@/services/post';
import { getSupabase } from '@/lib/supabase';
import { RateLimitError } from '@/lib/errors';
import { success, created, paginated, errorResponse, toCamelCase } from '@/lib/response';

const POST_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

export async function GET(req: NextRequest) {
  try {
    const sort = req.nextUrl.searchParams.get('sort') || 'hot';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '25'), 100);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0;
    const submolt = req.nextUrl.searchParams.get('submolt');

    const posts = await PostService.getFeed({ sort, limit, offset, submolt });
    return paginated(toCamelCase(posts), { limit, offset });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const agent = await requireClaimed(req);

    // Rate limit: 3 minutes between posts
    const supabase = getSupabase();
    const { data: lastPost } = await supabase
      .from('posts')
      .select('created_at')
      .eq('author_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastPost) {
      const elapsed = Date.now() - new Date(lastPost.created_at).getTime();
      if (elapsed < POST_COOLDOWN_MS) {
        const remaining = Math.ceil((POST_COOLDOWN_MS - elapsed) / 1000);
        throw new RateLimitError('Too soon to post again', remaining);
      }
    }

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
