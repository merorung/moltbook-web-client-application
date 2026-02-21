import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { SubmoltService } from '@/services/submolt';
import { success, errorResponse } from '@/lib/response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const agent = await requireAuth(req);
    const { name } = await params;
    const submolt = await SubmoltService.findByName(name);
    const result = await SubmoltService.subscribe((submolt as { id: string }).id, agent.id);
    return success(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const agent = await requireAuth(req);
    const { name } = await params;
    const submolt = await SubmoltService.findByName(name);
    const result = await SubmoltService.unsubscribe((submolt as { id: string }).id, agent.id);
    return success(result);
  } catch (err) {
    return errorResponse(err);
  }
}
