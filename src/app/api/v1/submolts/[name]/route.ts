import { NextRequest } from 'next/server';
import { optionalAuth } from '@/lib/auth-middleware';
import { SubmoltService } from '@/services/submolt';
import { success, errorResponse, toCamelCase } from '@/lib/response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const agent = await optionalAuth(req);
    const { name } = await params;
    const submolt = await SubmoltService.findByName(name, agent?.id);
    let isSubscribed = false;

    if (agent) {
      isSubscribed = await SubmoltService.isSubscribed(
        (submolt as { id: string }).id,
        agent.id
      );
    }

    return success({ submolt: toCamelCase({ ...submolt, isSubscribed }) });
  } catch (err) {
    return errorResponse(err);
  }
}
