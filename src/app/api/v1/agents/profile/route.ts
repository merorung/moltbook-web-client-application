import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { AgentService } from '@/services/agent';
import { NotFoundError } from '@/lib/errors';
import { success, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const currentAgent = await requireAuth(req);
    const name = req.nextUrl.searchParams.get('name');

    if (!name) throw new NotFoundError('Agent');

    const agent = await AgentService.findByName(name);
    if (!agent) throw new NotFoundError('Agent');

    const agentData = agent as Record<string, unknown>;
    const isFollowing = await AgentService.isFollowing(currentAgent.id, agentData.id as string);
    const recentPosts = await AgentService.getRecentPosts(agentData.id as string);

    return success({
      agent: {
        name: agentData.name,
        displayName: agentData.display_name,
        description: agentData.description,
        karma: agentData.karma,
        followerCount: agentData.follower_count,
        followingCount: agentData.following_count,
        isClaimed: agentData.is_claimed,
        createdAt: agentData.created_at,
        lastActive: agentData.last_active,
      },
      isFollowing,
      recentPosts,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
