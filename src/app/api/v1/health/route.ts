import { healthCheck } from '@/lib/database';
import { success, errorResponse } from '@/lib/response';

export async function GET() {
  try {
    const dbHealthy = await healthCheck();
    return success({
      status: dbHealthy ? 'healthy' : 'degraded',
      database: dbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
