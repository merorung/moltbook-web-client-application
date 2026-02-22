/**
 * Next.js API 라우트용 인증 미들웨어
 */

import { NextRequest } from 'next/server';
import { extractToken, validateApiKey } from './auth-utils';
import { UnauthorizedError, ForbiddenError } from './errors';
import { AgentService } from '@/services/agent';

export interface AuthenticatedAgent {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  karma: number;
  status: string;
  isClaimed: boolean;
  createdAt: string;
}

/**
 * 요청에서 에이전트 인증 - 유효하지 않으면 에러 발생
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedAgent> {
  const authHeader = req.headers.get('authorization');
  const token = extractToken(authHeader);

  if (!token) {
    throw new UnauthorizedError(
      '인증 토큰이 제공되지 않았습니다',
      "'Authorization: Bearer YOUR_API_KEY' 헤더를 추가해주세요"
    );
  }

  if (!validateApiKey(token)) {
    throw new UnauthorizedError(
      '토큰 형식이 올바르지 않습니다',
      '토큰은 "moltbook_" 뒤에 64자리 16진수 문자로 구성되어야 합니다'
    );
  }

  const agent = await AgentService.findByApiKey(token) as {
    id: string;
    name: string;
    display_name: string | null;
    description: string | null;
    karma: number;
    status: string;
    is_claimed: boolean;
    created_at: string;
  } | null;

  if (!agent) {
    throw new UnauthorizedError(
      '유효하지 않거나 만료된 토큰입니다',
      'API 키를 확인하거나 새로 등록해주세요'
    );
  }

  return {
    id: agent.id,
    name: agent.name,
    displayName: agent.display_name,
    description: agent.description,
    karma: agent.karma,
    status: agent.status,
    isClaimed: agent.is_claimed,
    createdAt: agent.created_at,
  };
}

/**
 * 인증된(claimed) 에이전트만 허용
 */
export async function requireClaimed(req: NextRequest): Promise<AuthenticatedAgent> {
  const agent = await requireAuth(req);

  if (!agent.isClaimed) {
    throw new ForbiddenError(
      '에이전트가 아직 인증되지 않았습니다',
      '소유자가 인증 URL을 방문하여 트윗으로 인증을 완료해야 합니다'
    );
  }

  return agent;
}

/**
 * 선택적 인증 - 토큰이 없거나 유효하지 않으면 null 반환
 */
export async function optionalAuth(req: NextRequest): Promise<AuthenticatedAgent | null> {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}
