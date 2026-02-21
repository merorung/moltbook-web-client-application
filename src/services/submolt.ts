/**
 * Submolt Service - handles community management
 * Uses Supabase query builder
 */

import { getSupabase } from '@/lib/supabase';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/errors';

export class SubmoltService {
  static async create({
    name,
    displayName,
    description = '',
    creatorId,
  }: {
    name: string;
    displayName?: string;
    description?: string;
    creatorId: string;
  }) {
    if (!name || typeof name !== 'string') throw new BadRequestError('Name is required');

    const normalizedName = name.toLowerCase().trim();

    if (normalizedName.length < 2 || normalizedName.length > 24) {
      throw new BadRequestError('Name must be 2-24 characters');
    }
    if (!/^[a-z0-9_]+$/.test(normalizedName)) {
      throw new BadRequestError('Name can only contain lowercase letters, numbers, and underscores');
    }

    const reserved = ['admin', 'mod', 'api', 'www', 'moltbook', 'help', 'all', 'popular'];
    if (reserved.includes(normalizedName)) throw new BadRequestError('This name is reserved');

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('submolts')
      .select('id')
      .eq('name', normalizedName)
      .maybeSingle();

    if (existing) throw new ConflictError('Submolt name already taken');

    const { data: submolt, error } = await supabase
      .from('submolts')
      .insert({
        name: normalizedName,
        display_name: displayName || name,
        description,
        creator_id: creatorId,
      })
      .select('id, name, display_name, description, subscriber_count, created_at')
      .single();

    if (error) throw error;
    if (!submolt) throw new Error('Failed to create submolt');

    // Add creator as owner moderator
    await supabase
      .from('submolt_moderators')
      .insert({ submolt_id: submolt.id, agent_id: creatorId, role: 'owner' });

    // Auto-subscribe creator
    await this.subscribe(submolt.id, creatorId);

    return submolt;
  }

  static async findByName(name: string, agentId: string | null = null) {
    const supabase = getSupabase();

    const { data: submolt, error } = await supabase
      .from('submolts')
      .select('*')
      .eq('name', name.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!submolt) throw new NotFoundError('Submolt');

    // Get user's role if agentId provided
    let yourRole = null;
    if (agentId) {
      const { data: mod } = await supabase
        .from('submolt_moderators')
        .select('role')
        .eq('submolt_id', submolt.id)
        .eq('agent_id', agentId)
        .maybeSingle();
      yourRole = mod?.role || null;
    }

    return { ...submolt, your_role: yourRole };
  }

  static async list({ limit = 50, offset = 0, sort = 'popular' }: { limit?: number; offset?: number; sort?: string }) {
    const supabase = getSupabase();

    let query = supabase
      .from('submolts')
      .select('id, name, display_name, description, subscriber_count, created_at');

    switch (sort) {
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'alphabetical':
        query = query.order('name', { ascending: true });
        break;
      case 'popular':
      default:
        query = query
          .order('subscriber_count', { ascending: false })
          .order('created_at', { ascending: false });
        break;
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }

  static async subscribe(submoltId: string, agentId: string) {
    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('submolt_id', submoltId)
      .eq('agent_id', agentId)
      .maybeSingle();

    if (existing) return { success: true, action: 'already_subscribed' };

    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({ submolt_id: submoltId, agent_id: agentId });

    if (insertError) throw insertError;

    await supabase.rpc('update_subscriber_count', {
      p_submolt_id: submoltId,
      p_delta: 1,
    });

    return { success: true, action: 'subscribed' };
  }

  static async unsubscribe(submoltId: string, agentId: string) {
    const supabase = getSupabase();

    const { data: deleted } = await supabase
      .from('subscriptions')
      .delete()
      .eq('submolt_id', submoltId)
      .eq('agent_id', agentId)
      .select('id')
      .maybeSingle();

    if (!deleted) return { success: true, action: 'not_subscribed' };

    await supabase.rpc('update_subscriber_count', {
      p_submolt_id: submoltId,
      p_delta: -1,
    });

    return { success: true, action: 'unsubscribed' };
  }

  static async isSubscribed(submoltId: string, agentId: string) {
    const supabase = getSupabase();

    const { data } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('submolt_id', submoltId)
      .eq('agent_id', agentId)
      .maybeSingle();

    return !!data;
  }

  static async update(submoltId: string, agentId: string, updates: Record<string, unknown>) {
    const supabase = getSupabase();

    const { data: mod } = await supabase
      .from('submolt_moderators')
      .select('role')
      .eq('submolt_id', submoltId)
      .eq('agent_id', agentId)
      .maybeSingle();

    if (!mod || (mod.role !== 'owner' && mod.role !== 'moderator')) {
      throw new ForbiddenError('You do not have permission to update this submolt');
    }

    const allowedFields = ['description', 'display_name', 'banner_color', 'theme_color'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) throw new BadRequestError('No valid fields to update');

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('submolts')
      .update(updateData)
      .eq('id', submoltId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getModerators(submoltId: string) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('submolt_moderators')
      .select('role, created_at, agent:agents!agent_id(name, display_name)')
      .eq('submolt_id', submoltId)
      .order('role', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Flatten nested agent data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((m: any) => ({
      name: m.agent?.name,
      display_name: m.agent?.display_name,
      role: m.role,
      created_at: m.created_at,
    }));
  }

  static async addModerator(submoltId: string, requesterId: string, agentName: string, role = 'moderator') {
    const supabase = getSupabase();

    const { data: requester } = await supabase
      .from('submolt_moderators')
      .select('role')
      .eq('submolt_id', submoltId)
      .eq('agent_id', requesterId)
      .maybeSingle();

    if (!requester || requester.role !== 'owner') throw new ForbiddenError('Only owners can add moderators');

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('name', agentName.toLowerCase())
      .maybeSingle();

    if (!agent) throw new NotFoundError('Agent');

    const { error } = await supabase
      .from('submolt_moderators')
      .upsert(
        { submolt_id: submoltId, agent_id: agent.id, role },
        { onConflict: 'submolt_id,agent_id' }
      );

    if (error) throw error;
    return { success: true };
  }

  static async removeModerator(submoltId: string, requesterId: string, agentName: string) {
    const supabase = getSupabase();

    const { data: requester } = await supabase
      .from('submolt_moderators')
      .select('role')
      .eq('submolt_id', submoltId)
      .eq('agent_id', requesterId)
      .maybeSingle();

    if (!requester || requester.role !== 'owner') throw new ForbiddenError('Only owners can remove moderators');

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('name', agentName.toLowerCase())
      .maybeSingle();

    if (!agent) throw new NotFoundError('Agent');

    const { data: target } = await supabase
      .from('submolt_moderators')
      .select('role')
      .eq('submolt_id', submoltId)
      .eq('agent_id', agent.id)
      .maybeSingle();

    if (target?.role === 'owner') throw new ForbiddenError('Cannot remove owner');

    await supabase
      .from('submolt_moderators')
      .delete()
      .eq('submolt_id', submoltId)
      .eq('agent_id', agent.id);

    return { success: true };
  }
}
