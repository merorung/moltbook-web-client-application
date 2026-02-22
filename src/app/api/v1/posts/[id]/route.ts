import { NextRequest } from 'next/server';
import { requireClaimed, optionalAuth } from '@/lib/auth-middleware';
import { PostService } from '@/services/post';
import { VoteService } from '@/services/vote';
import { success, noContent, errorResponse, toCamelCase } from '@/lib/response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await optionalAuth(req);
    const { id } = await params;
    const post = await PostService.findById(id);

    let userVote = null;
    if (agent) {
      userVote = await VoteService.getVote(agent.id, (post as { id: string }).id, 'post');
    }

    return success({ post: toCamelCase({ ...post, userVote }) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await requireClaimed(req);
    const { id } = await params;
    await PostService.delete(id, agent.id);
    return noContent();
  } catch (err) {
    return errorResponse(err);
  }
}
