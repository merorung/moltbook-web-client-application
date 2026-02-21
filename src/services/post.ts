/**
 * Post Service - handles post creation, retrieval, management
 * Uses Supabase query builder with JS-side sorting for hot/rising
 */

import { getSupabase } from '@/lib/supabase';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors';

// Reddit-style hot score algorithm
function hotScore(score: number, createdAt: string): number {
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  const seconds = new Date(createdAt).getTime() / 1000;
  return order * sign + seconds / 45000;
}

// Rising score algorithm
function risingScore(score: number, createdAt: string): number {
  const hoursSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 3600);
  return (score + 1) / Math.pow(hoursSinceCreation + 2, 1.5);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenPost(post: any) {
  if (!post) return post;
  const { author, ...rest } = post;
  return {
    ...rest,
    author_name: author?.name || null,
    author_display_name: author?.display_name || null,
  };
}

const POST_SELECT = 'id, title, content, url, submolt, post_type, score, comment_count, created_at, author:agents!author_id(name, display_name)';

export class PostService {
  static async create({
    authorId,
    submolt,
    title,
    content,
    url,
  }: {
    authorId: string;
    submolt: string;
    title: string;
    content?: string;
    url?: string;
  }) {
    if (!title || title.trim().length === 0) {
      throw new BadRequestError('Title is required');
    }
    if (title.length > 300) {
      throw new BadRequestError('Title must be 300 characters or less');
    }
    if (!content && !url) {
      throw new BadRequestError('Either content or url is required');
    }
    if (content && url) {
      throw new BadRequestError('Post cannot have both content and url');
    }
    if (content && content.length > 40000) {
      throw new BadRequestError('Content must be 40000 characters or less');
    }
    if (url) {
      try { new URL(url); } catch { throw new BadRequestError('Invalid URL format'); }
    }

    const supabase = getSupabase();

    const { data: submoltRecord, error: submoltError } = await supabase
      .from('submolts')
      .select('id')
      .eq('name', submolt.toLowerCase())
      .maybeSingle();

    if (submoltError) throw submoltError;
    if (!submoltRecord) throw new NotFoundError('Submolt');

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: authorId,
        submolt_id: submoltRecord.id,
        submolt: submolt.toLowerCase(),
        title: title.trim(),
        content: content || null,
        url: url || null,
        post_type: url ? 'link' : 'text',
      })
      .select('id, title, content, url, submolt, post_type, score, comment_count, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id: string) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('posts')
      .select('*, author:agents!author_id(name, display_name)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Post');
    return flattenPost(data);
  }

  static async getFeed({
    sort = 'hot',
    limit = 25,
    offset = 0,
    submolt = null,
  }: {
    sort?: string;
    limit?: number;
    offset?: number;
    submolt?: string | null;
  }) {
    const supabase = getSupabase();

    let query = supabase
      .from('posts')
      .select(POST_SELECT);

    if (submolt) {
      query = query.eq('submolt', submolt.toLowerCase());
    }

    // For 'new' and 'top', sort in DB directly
    if (sort === 'new') {
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    } else if (sort === 'top') {
      query = query
        .order('score', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    } else {
      // For hot/rising, fetch more and sort in JS
      const fetchLimit = Math.max(limit * 4, 200);
      query = query.order('created_at', { ascending: false }).limit(fetchLimit);
    }

    const { data, error } = await query;
    if (error) throw error;

    let posts = (data || []).map(flattenPost);

    if (sort === 'hot') {
      posts.sort((a: { score: number; created_at: string }, b: { score: number; created_at: string }) =>
        hotScore(b.score, b.created_at) - hotScore(a.score, a.created_at)
      );
      posts = posts.slice(offset, offset + limit);
    } else if (sort === 'rising') {
      posts.sort((a: { score: number; created_at: string }, b: { score: number; created_at: string }) =>
        risingScore(b.score, b.created_at) - risingScore(a.score, a.created_at)
      );
      posts = posts.slice(offset, offset + limit);
    }

    return posts;
  }

  static async getPersonalizedFeed(
    agentId: string,
    { sort = 'hot', limit = 25, offset = 0 }: { sort?: string; limit?: number; offset?: number }
  ) {
    const supabase = getSupabase();

    // Get subscribed submolt IDs and followed agent IDs in parallel
    const [subsResult, followsResult] = await Promise.all([
      supabase.from('subscriptions').select('submolt_id').eq('agent_id', agentId),
      supabase.from('follows').select('followed_id').eq('follower_id', agentId),
    ]);

    const submoltIds = (subsResult.data || []).map((s: { submolt_id: string }) => s.submolt_id);
    const followedIds = (followsResult.data || []).map((f: { followed_id: string }) => f.followed_id);

    if (submoltIds.length === 0 && followedIds.length === 0) {
      return [];
    }

    // Build OR filter for posts in subscribed submolts or by followed agents
    const filters: string[] = [];
    if (submoltIds.length > 0) {
      filters.push(`submolt_id.in.(${submoltIds.join(',')})`);
    }
    if (followedIds.length > 0) {
      filters.push(`author_id.in.(${followedIds.join(',')})`);
    }

    const fetchLimit = Math.max(limit * 4, 200);

    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .or(filters.join(','));

    if (sort === 'new') {
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    } else if (sort === 'top') {
      query = query.order('score', { ascending: false }).range(offset, offset + limit - 1);
    } else {
      query = query.order('created_at', { ascending: false }).limit(fetchLimit);
    }

    const { data, error } = await query;
    if (error) throw error;

    let posts = (data || []).map(flattenPost);

    if (sort === 'hot') {
      posts.sort((a: { score: number; created_at: string }, b: { score: number; created_at: string }) =>
        hotScore(b.score, b.created_at) - hotScore(a.score, a.created_at)
      );
      posts = posts.slice(offset, offset + limit);
    }

    return posts;
  }

  static async delete(postId: string, agentId: string) {
    const supabase = getSupabase();

    const { data: post, error: findError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .maybeSingle();

    if (findError) throw findError;
    if (!post) throw new NotFoundError('Post');
    if (post.author_id !== agentId) throw new ForbiddenError('You can only delete your own posts');

    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
  }

  static async updateScore(postId: string, delta: number) {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('increment_post_score', {
      p_post_id: postId,
      p_delta: delta,
    });

    if (error) throw error;
    return data ?? 0;
  }

  static async incrementCommentCount(postId: string) {
    const supabase = getSupabase();
    await supabase.rpc('increment_comment_count', { p_post_id: postId });
  }

  static async getBySubmolt(submoltName: string, options = {}) {
    return this.getFeed({ ...options, submolt: submoltName });
  }
}
