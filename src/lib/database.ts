/**
 * Database helper - Supabase-based health check
 */

import { getSupabase } from './supabase';

export { getSupabase };

/**
 * Health check - test database connectivity
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const { error } = await getSupabase().from('agents').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
