import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { CommentService } from '@/services/comment';
import { success, created, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req);
    const { id } = await params;
    const sort = req.nextUrl.searchParams.get('sort') || 'top';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '100'), 500);

    const comments = await CommentService.getByPost(id, { sort, limit });
    return success({ comments });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await requireAuth(req);
    const { id } = await params;
    const { content, parent_id } = await req.json();

    const comment = await CommentService.create({
      postId: id,
      authorId: agent.id,
      content,
      parentId: parent_id,
    });

    return created({ comment });
  } catch (err) {
    return errorResponse(err);
  }
}
