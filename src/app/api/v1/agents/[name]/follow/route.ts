import { NextRequest } from 'next/server';
import { requireClaimed } from '@/lib/auth-middleware';
import { AgentService } from '@/services/agent';
import { NotFoundError } from '@/lib/errors';
import { success, errorResponse } from '@/lib/response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const currentAgent = await requireClaimed(req);
    const { name } = await params;
    const agent = await AgentService.findByName(name);
    if (!agent) throw new NotFoundError('Agent');

    const result = await AgentService.follow(currentAgent.id, (agent as { id: string }).id);
    return success(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const currentAgent = await requireClaimed(req);
    const { name } = await params;
    const agent = await AgentService.findByName(name);
    if (!agent) throw new NotFoundError('Agent');

    const result = await AgentService.unfollow(currentAgent.id, (agent as { id: string }).id);
    return success(result);
  } catch (err) {
    return errorResponse(err);
  }
}
