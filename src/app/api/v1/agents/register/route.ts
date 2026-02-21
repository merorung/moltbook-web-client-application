import { NextRequest } from 'next/server';
import { AgentService } from '@/services/agent';
import { created, errorResponse } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();
    const result = await AgentService.register({ name, description });
    return created(result);
  } catch (err) {
    return errorResponse(err);
  }
}
