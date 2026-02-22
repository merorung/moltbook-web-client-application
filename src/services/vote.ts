/**
 * Vote Service - handles upvotes, downvotes, karma
 * Uses Supabase query builder
 */

import { getSupabase } from '@/lib/supabase';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { AgentService } from './agent';
import { PostService } from './post';
import { CommentService } from './comment';

const VOTE_UP = 1;
const VOTE_DOWN = -1;

export class VoteService {
  static async upvotePost(postId: string, agentId: string) {
    return this.vote({ targetId: postId, targetType: 'post', agentId, value: VOTE_UP });
  }

  static async downvotePost(postId: string, agentId: string) {
    return this.vote({ targetId: postId, targetType: 'post', agentId, value: VOTE_DOWN });
  }

  static async upvoteComment(commentId: string, agentId: string) {
    return this.vote({ targetId: commentId, targetType: 'comment', agentId, value: VOTE_UP });
  }

  static async downvoteComment(commentId: string, agentId: string) {
    return this.vote({ targetId: commentId, targetType: 'comment', agentId, value: VOTE_DOWN });
  }

  static async vote({
    targetId,
    targetType,
    agentId,
    value,
  }: {
    targetId: string;
    targetType: 'post' | 'comment';
    agentId: string;
    value: number;
  }) {
    const target = await this.getTarget(targetId, targetType);

    if ((target as { author_id: string }).author_id === agentId) {
      throw new BadRequestError('Cannot vote on your own content');
    }

    const supabase = getSupabase();

    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, value')
      .eq('agent_id', agentId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .maybeSingle();

    let action: string;
    let scoreDelta: number;
    let karmaDelta: number;

    if (existingVote) {
      if (existingVote.value === value) {
        // Same vote direction → remove vote
        action = 'removed';
        scoreDelta = -value;
        karmaDelta = -value;
        await supabase.from('votes').delete().eq('id', existingVote.id);
      } else {
        // Different direction → change vote
        action = 'changed';
        scoreDelta = value * 2;
        karmaDelta = value * 2;
        await supabase.from('votes').update({ value }).eq('id', existingVote.id);
      }
    } else {
      // New vote
      action = value === VOTE_UP ? 'upvoted' : 'downvoted';
      scoreDelta = value;
      karmaDelta = value;
      await supabase.from('votes').insert({
        agent_id: agentId,
        target_id: targetId,
        target_type: targetType,
        value,
      });
    }

    // Update target score and author karma
    if (targetType === 'post') {
      await PostService.updateScore(targetId, scoreDelta);
    } else {
      await CommentService.updateScore(targetId, scoreDelta, value === VOTE_UP);
    }

    await AgentService.updateKarma((target as { author_id: string }).author_id, karmaDelta);

    const author = await AgentService.findById((target as { author_id: string }).author_id);

    return {
      success: true,
      message:
        action === 'upvoted' ? 'Upvoted!' :
        action === 'downvoted' ? 'Downvoted!' :
        action === 'removed' ? 'Vote removed!' : 'Vote changed!',
      action,
      author: author ? { name: (author as { name: string }).name } : null,
    };
  }

  static async getTarget(targetId: string, targetType: string) {
    const supabase = getSupabase();

    if (targetType === 'post') {
      const { data, error } = await supabase
        .from('posts')
        .select('id, author_id')
        .eq('id', targetId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new NotFoundError('Post');
      return data;
    } else if (targetType === 'comment') {
      const { data, error } = await supabase
        .from('comments')
        .select('id, author_id')
        .eq('id', targetId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new NotFoundError('Comment');
      return data;
    } else {
      throw new BadRequestError('Invalid target type');
    }
  }

  static async getVote(agentId: string, targetId: string, targetType: string) {
    const supabase = getSupabase();

    const { data } = await supabase
      .from('votes')
      .select('value')
      .eq('agent_id', agentId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .maybeSingle();

    return data?.value || null;
  }

  static async getVotes(agentId: string, targets: { targetId: string; targetType: string }[]) {
    if (targets.length === 0) return new Map<string, number>();

    const supabase = getSupabase();
    const postIds = targets.filter((t) => t.targetType === 'post').map((t) => t.targetId);
    const commentIds = targets.filter((t) => t.targetType === 'comment').map((t) => t.targetId);

    const results = new Map<string, number>();

    if (postIds.length > 0) {
      const { data: votes } = await supabase
        .from('votes')
        .select('target_id, value')
        .eq('agent_id', agentId)
        .eq('target_type', 'post')
        .in('target_id', postIds);

      (votes || []).forEach((v: { target_id: string; value: number }) => results.set(v.target_id, v.value));
    }

    if (commentIds.length > 0) {
      const { data: votes } = await supabase
        .from('votes')
        .select('target_id, value')
        .eq('agent_id', agentId)
        .eq('target_type', 'comment')
        .in('target_id', commentIds);

      (votes || []).forEach((v: { target_id: string; value: number }) => results.set(v.target_id, v.value));
    }

    return results;
  }
}
