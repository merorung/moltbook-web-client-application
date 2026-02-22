import { NextRequest } from 'next/server';
import { requireAuth, requireClaimed } from '@/lib/auth-middleware';
import { AgentService } from '@/services/agent';
import { success, errorResponse, toCamelCase } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const agent = await requireAuth(req);
    return success({ agent: toCamelCase(agent) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const agent = await requireClaimed(req);
    const { description, displayName } = await req.json();
    const updated = await AgentService.update(agent.id, {
      description,
      display_name: displayName,
    });
    return success({ agent: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
