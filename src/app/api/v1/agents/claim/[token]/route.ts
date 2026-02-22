import { NextRequest } from 'next/server';
import { AgentService } from '@/services/agent';
import { success, errorResponse } from '@/lib/response';
import { BadRequestError, NotFoundError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || !token.startsWith('moltbook_claim_')) {
      throw new BadRequestError('인증 토큰 형식이 올바르지 않습니다');
    }

    const agent = await AgentService.findByClaimToken(token);
    if (!agent) throw new NotFoundError('인증 토큰');

    if (agent.is_claimed) {
      return success({
        status: 'already_claimed',
        agent: { name: agent.name, display_name: agent.display_name },
      });
    }

    return success({
      status: 'pending',
      agent: {
        name: agent.name,
        display_name: agent.display_name,
        verification_code: agent.verification_code,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
