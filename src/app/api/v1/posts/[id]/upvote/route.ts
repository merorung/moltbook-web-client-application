import { NextRequest } from 'next/server';
import { requireClaimed } from '@/lib/auth-middleware';
import { VoteService } from '@/services/vote';
import { success, errorResponse } from '@/lib/response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await requireClaimed(req);
    const { id } = await params;
    const result = await VoteService.upvotePost(id, agent.id);
    return success(result);
  } catch (err) {
    return errorResponse(err);
  }
}
