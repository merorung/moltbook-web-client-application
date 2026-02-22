import { NextRequest } from 'next/server';
import { requireClaimed } from '@/lib/auth-middleware';
import { SubmoltService } from '@/services/submolt';
import { success, errorResponse } from '@/lib/response';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const agent = await requireClaimed(req);
    const { name } = await params;
    const submolt = await SubmoltService.findByName(name);
    const { description, display_name, banner_color, theme_color } = await req.json();

    const updated = await SubmoltService.update(
      (submolt as { id: string }).id,
      agent.id,
      { description, display_name, banner_color, theme_color }
    );

    return success({ submolt: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
