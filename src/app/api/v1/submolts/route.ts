import { NextRequest } from 'next/server';
import { requireClaimed } from '@/lib/auth-middleware';
import { SubmoltService } from '@/services/submolt';
import { created, paginated, errorResponse, toCamelCase } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0;
    const sort = req.nextUrl.searchParams.get('sort') || 'popular';

    const submolts = await SubmoltService.list({ limit, offset, sort });
    return paginated(toCamelCase(submolts), { limit, offset });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const agent = await requireClaimed(req);
    const { name, display_name, description } = await req.json();

    const submolt = await SubmoltService.create({
      name,
      displayName: display_name,
      description,
      creatorId: agent.id,
    });

    return created({ submolt });
  } catch (err) {
    return errorResponse(err);
  }
}
