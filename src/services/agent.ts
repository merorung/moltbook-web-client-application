/**
 * Agent Service - handles registration, auth, profile management
 * Uses Supabase query builder
 */

import { getSupabase } from '@/lib/supabase';
import { generateApiKey, generateClaimToken, generateVerificationCode, hashToken } from '@/lib/auth-utils';
import { BadRequestError, NotFoundError, ConflictError } from '@/lib/errors';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export class AgentService {
  static async register({ name, description = '' }: { name: string; description?: string }) {
    if (!name || typeof name !== 'string') {
      throw new BadRequestError('Name is required');
    }

    const normalizedName = name.toLowerCase().trim();

    if (normalizedName.length < 2 || normalizedName.length > 32) {
      throw new BadRequestError('Name must be 2-32 characters');
    }

    if (!/^[a-z0-9_]+$/i.test(normalizedName)) {
      throw new BadRequestError('Name can only contain letters, numbers, and underscores');
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('name', normalizedName)
      .maybeSingle();

    if (existing) {
      throw new ConflictError('Name already taken', 'Try a different name');
    }

    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();
    const verificationCode = generateVerificationCode();
    const apiKeyHash = hashToken(apiKey);

    const { error } = await supabase
      .from('agents')
      .insert({
        name: normalizedName,
        display_name: name.trim(),
        description,
        api_key_hash: apiKeyHash,
        claim_token: claimToken,
        verification_code: verificationCode,
        status: 'pending_claim',
      });

    if (error) throw error;

    return {
      agent: {
        api_key: apiKey,
        claim_url: `${BASE_URL}/claim/${claimToken}`,
        verification_code: verificationCode,
      },
      important: 'Save your API key! You will not see it again.',
    };
  }

  static async findByApiKey(apiKey: string) {
    const apiKeyHash = hashToken(apiKey);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('agents')
      .select('id, name, display_name, description, karma, status, is_claimed, created_at, updated_at')
      .eq('api_key_hash', apiKeyHash)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findByName(name: string) {
    const normalizedName = name.toLowerCase().trim();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('agents')
      .select('id, name, display_name, description, karma, status, is_claimed, follower_count, following_count, created_at, last_active')
      .eq('name', normalizedName)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findById(id: string) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('agents')
      .select('id, name, display_name, description, karma, status, is_claimed, follower_count, following_count, created_at, last_active')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async update(id: string, updates: Record<string, unknown>) {
    const allowedFields = ['description', 'display_name', 'avatar_url'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No valid fields to update');
    }

    updateData.updated_at = new Date().toISOString();

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', id)
      .select('id, name, display_name, description, karma, status, is_claimed, updated_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Agent');
    return data;
  }

  static async getStatus(id: string) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('agents')
      .select('status, is_claimed')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Agent');
    return { status: data.is_claimed ? 'claimed' : 'pending_claim' };
  }

  static async findByClaimToken(claimToken: string) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('agents')
      .select('id, name, display_name, verification_code, is_claimed')
      .eq('claim_token', claimToken)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async claim(claimToken: string, twitterData: { id: string; handle: string }) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('agents')
      .update({
        is_claimed: true,
        status: 'active',
        owner_twitter_id: twitterData.id,
        owner_twitter_handle: twitterData.handle,
        claimed_at: new Date().toISOString(),
        claim_token: null,
      })
      .eq('claim_token', claimToken)
      .eq('is_claimed', false)
      .select('id, name, display_name')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Claim token');
    return data;
  }

  static async updateKarma(id: string, delta: number) {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('increment_karma', {
      p_agent_id: id,
      p_delta: delta,
    });

    if (error) throw error;
    return data ?? 0;
  }

  static async follow(followerId: string, followedId: string) {
    if (followerId === followedId) {
      throw new BadRequestError('Cannot follow yourself');
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .maybeSingle();

    if (existing) {
      return { success: true, action: 'already_following' };
    }

    const { error: insertError } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, followed_id: followedId });

    if (insertError) throw insertError;

    await supabase.rpc('update_follow_counts', {
      p_follower_id: followerId,
      p_followed_id: followedId,
      p_delta: 1,
    });

    return { success: true, action: 'followed' };
  }

  static async unfollow(followerId: string, followedId: string) {
    const supabase = getSupabase();

    const { data: deleted } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .select('id')
      .maybeSingle();

    if (!deleted) {
      return { success: true, action: 'not_following' };
    }

    await supabase.rpc('update_follow_counts', {
      p_follower_id: followerId,
      p_followed_id: followedId,
      p_delta: -1,
    });

    return { success: true, action: 'unfollowed' };
  }

  static async isFollowing(followerId: string, followedId: string) {
    const supabase = getSupabase();

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .maybeSingle();

    return !!data;
  }

  static async getRecentPosts(agentId: string, limit = 10) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('posts')
      .select('id, title, content, url, submolt, score, comment_count, created_at')
      .eq('author_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}
