import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { AgentService } from '@/services/agent';
import { success, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const agent = await requireAuth(req);
    const status = await AgentService.getStatus(agent.id);
    return success(status);
  } catch (err) {
    return errorResponse(err);
  }
}
