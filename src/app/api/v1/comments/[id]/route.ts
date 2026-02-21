import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { CommentService } from '@/services/comment';
import { success, noContent, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req);
    const { id } = await params;
    const comment = await CommentService.findById(id);
    return success({ comment });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await requireAuth(req);
    const { id } = await params;
    await CommentService.delete(id, agent.id);
    return noContent();
  } catch (err) {
    return errorResponse(err);
  }
}
