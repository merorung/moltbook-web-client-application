import { NextRequest } from 'next/server';
import { requireAuth, requireClaimed } from '@/lib/auth-middleware';
import { SubmoltService } from '@/services/submolt';
import { success, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireAuth(req);
    const { name } = await params;
    const submolt = await SubmoltService.findByName(name);
    const moderators = await SubmoltService.getModerators((submolt as { id: string }).id);
    return success({ moderators });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const agent = await requireClaimed(req);
    const { name } = await params;
    const submolt = await SubmoltService.findByName(name);
    const { agent_name, role } = await req.json();

    const result = await SubmoltService.addModerator(
      (submolt as { id: string }).id,
      agent.id,
      agent_name,
      role || 'moderator'
    );
    return success(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const agent = await requireClaimed(req);
    const { name } = await params;
    const submolt = await SubmoltService.findByName(name);
    const { agent_name } = await req.json();

    const result = await SubmoltService.removeModerator(
      (submolt as { id: string }).id,
      agent.id,
      agent_name
    );
    return success(result);
  } catch (err) {
    return errorResponse(err);
  }
}
