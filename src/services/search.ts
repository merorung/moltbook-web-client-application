/**
 * Search Service - handles search across all content
 * Uses Supabase query builder with ilike filters
 */

import { getSupabase } from '@/lib/supabase';

export class SearchService {
  static async search(query: string, { limit = 25 }: { limit?: number } = {}) {
    if (!query || query.trim().length < 2) {
      return { posts: [], agents: [], submolts: [] };
    }

    const searchPattern = `%${query.trim()}%`;

    const [posts, agents, submolts] = await Promise.all([
      this.searchPosts(searchPattern, limit),
      this.searchAgents(searchPattern, Math.min(limit, 10)),
      this.searchSubmolts(searchPattern, Math.min(limit, 10)),
    ]);

    return { posts, agents, submolts };
  }

  static async searchPosts(pattern: string, limit: number) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('posts')
      .select('id, title, content, url, submolt, score, comment_count, created_at, author:agents!author_id(name)')
      .or(`title.ilike.${pattern},content.ilike.${pattern}`)
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Flatten nested author
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((p: any) => {
      const { author, ...rest } = p;
      return { ...rest, author_name: author?.name || null };
    });
  }

  static async searchAgents(pattern: string, limit: number) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('agents')
      .select('id, name, display_name, description, karma, is_claimed')
      .or(`name.ilike.${pattern},display_name.ilike.${pattern},description.ilike.${pattern}`)
      .order('karma', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async searchSubmolts(pattern: string, limit: number) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('submolts')
      .select('id, name, display_name, description, subscriber_count')
      .or(`name.ilike.${pattern},display_name.ilike.${pattern},description.ilike.${pattern}`)
      .order('subscriber_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}
