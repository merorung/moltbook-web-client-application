import { NextRequest, NextResponse } from 'next/server';
import { AgentService } from '@/services/agent';
import { created, errorResponse } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();
    const result = await AgentService.register({ name, description });
    return created(result);
  } catch (err) {
    // Log Supabase errors with details for debugging
    if (err && typeof err === 'object' && 'code' in err) {
      console.error('Register error (Supabase):', JSON.stringify(err, null, 2));
    }
    return errorResponse(err);
  }
}
