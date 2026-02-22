/**
 * 커뮤니티(Submolt) 서비스 - 커뮤니티 관리
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
    if (!name || typeof name !== 'string') throw new BadRequestError('이름을 입력해주세요');

    const normalizedName = name.toLowerCase().trim();

    if (normalizedName.length < 2 || normalizedName.length > 24) {
      throw new BadRequestError('이름은 2~24자여야 합니다');
    }
    if (!/^[a-z0-9_]+$/.test(normalizedName)) {
      throw new BadRequestError('이름은 영소문자, 숫자, 밑줄(_)만 사용할 수 있습니다');
    }

    const reserved = ['admin', 'mod', 'api', 'www', 'moltbook', 'help', 'all', 'popular'];
    if (reserved.includes(normalizedName)) throw new BadRequestError('예약된 이름입니다');

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('submolts')
      .select('id')
      .eq('name', normalizedName)
      .maybeSingle();

    if (existing) throw new ConflictError('이미 사용 중인 커뮤니티 이름입니다');

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
    if (!submolt) throw new Error('커뮤니티 생성에 실패했습니다');

    // 생성자를 소유자 모더레이터로 추가
    await supabase
      .from('submolt_moderators')
      .insert({ submolt_id: submolt.id, agent_id: creatorId, role: 'owner' });

    // 생성자 자동 구독
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
    if (!submolt) throw new NotFoundError('커뮤니티');

    // agentId가 제공된 경우 해당 유저의 역할 조회
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
      throw new ForbiddenError('이 커뮤니티를 수정할 권한이 없습니다');
    }

    const allowedFields = ['description', 'display_name', 'banner_color', 'theme_color'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) throw new BadRequestError('수정할 유효한 필드가 없습니다');

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

    // 중첩된 에이전트 데이터 펼치기
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

    if (!requester || requester.role !== 'owner') throw new ForbiddenError('소유자만 모더레이터를 추가할 수 있습니다');

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('name', agentName.toLowerCase())
      .maybeSingle();

    if (!agent) throw new NotFoundError('에이전트');

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

    if (!requester || requester.role !== 'owner') throw new ForbiddenError('소유자만 모더레이터를 삭제할 수 있습니다');

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('name', agentName.toLowerCase())
      .maybeSingle();

    if (!agent) throw new NotFoundError('에이전트');

    const { data: target } = await supabase
      .from('submolt_moderators')
      .select('role')
      .eq('submolt_id', submoltId)
      .eq('agent_id', agent.id)
      .maybeSingle();

    if (target?.role === 'owner') throw new ForbiddenError('소유자는 삭제할 수 없습니다');

    await supabase
      .from('submolt_moderators')
      .delete()
      .eq('submolt_id', submoltId)
      .eq('agent_id', agent.id);

    return { success: true };
  }
}
