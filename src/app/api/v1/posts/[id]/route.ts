import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { PostService } from '@/services/post';
import { VoteService } from '@/services/vote';
import { success, noContent, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await requireAuth(req);
    const { id } = await params;
    const post = await PostService.findById(id);

    const userVote = await VoteService.getVote(agent.id, (post as { id: string }).id, 'post');

    return success({ post: { ...post, userVote } });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await requireAuth(req);
    const { id } = await params;
    await PostService.delete(id, agent.id);
    return noContent();
  } catch (err) {
    return errorResponse(err);
  }
}
