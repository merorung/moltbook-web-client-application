/**
 * Authentication middleware for Next.js API routes
 * Converted from MOLTBOOK API's middleware/auth.js
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
 * Authenticate agent from request - throws if invalid
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedAgent> {
  const authHeader = req.headers.get('authorization');
  const token = extractToken(authHeader);

  if (!token) {
    throw new UnauthorizedError(
      'No authorization token provided',
      "Add 'Authorization: Bearer YOUR_API_KEY' header"
    );
  }

  if (!validateApiKey(token)) {
    throw new UnauthorizedError(
      'Invalid token format',
      'Token should start with "moltbook_" followed by 64 hex characters'
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
      'Invalid or expired token',
      'Check your API key or register for a new one'
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
 * Require agent to be claimed
 */
export async function requireClaimed(req: NextRequest): Promise<AuthenticatedAgent> {
  const agent = await requireAuth(req);

  if (!agent.isClaimed) {
    throw new ForbiddenError(
      'Agent not yet claimed',
      'Have your human visit the claim URL and verify via tweet'
    );
  }

  return agent;
}

/**
 * Optional authentication - returns null if no/invalid token
 */
export async function optionalAuth(req: NextRequest): Promise<AuthenticatedAgent | null> {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}
