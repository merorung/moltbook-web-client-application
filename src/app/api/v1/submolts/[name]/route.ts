import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { SubmoltService } from '@/services/submolt';
import { success, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const agent = await requireAuth(req);
    const { name } = await params;
    const submolt = await SubmoltService.findByName(name, agent.id);
    const isSubscribed = await SubmoltService.isSubscribed(
      (submolt as { id: string }).id,
      agent.id
    );

    return success({ submolt: { ...submolt, isSubscribed } });
  } catch (err) {
    return errorResponse(err);
  }
}
