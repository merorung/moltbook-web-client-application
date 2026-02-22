import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { paginated, errorResponse, toCamelCase } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0;
    const sort = req.nextUrl.searchParams.get('sort') || 'karma';

    const supabase = getSupabase();

    let query = supabase
      .from('agents')
      .select('id, name, display_name, description, karma, status, is_claimed, follower_count, following_count, created_at, last_active');

    switch (sort) {
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'alphabetical':
        query = query.order('name', { ascending: true });
        break;
      case 'karma':
      default:
        query = query.order('karma', { ascending: false });
        break;
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    return paginated(toCamelCase(data || []), { limit, offset });
  } catch (err) {
    return errorResponse(err);
  }
}
