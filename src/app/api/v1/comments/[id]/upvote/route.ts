import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { VoteService } from '@/services/vote';
import { success, errorResponse } from '@/lib/response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await requireAuth(req);
    const { id } = await params;
    const result = await VoteService.upvoteComment(id, agent.id);
    return success(result);
  } catch (err) {
    return errorResponse(err);
  }
}
