import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthParams, buildAuthUrl, serializeOAuthCookie } from '@/lib/twitter-oauth';
import { errorResponse } from '@/lib/response';
import { BadRequestError } from '@/lib/errors';

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CALLBACK_URL = `${BASE_URL}/api/v1/agents/claim/twitter-callback`;

export async function GET(req: NextRequest) {
  try {
    const claimToken = req.nextUrl.searchParams.get('claim_token');

    if (!claimToken || !claimToken.startsWith('moltbook_claim_')) {
      throw new BadRequestError('claim_token이 없거나 올바르지 않습니다');
    }

    if (!TWITTER_CLIENT_ID) {
      throw new BadRequestError('Twitter OAuth가 설정되지 않았습니다');
    }

    const { state, codeVerifier, codeChallenge } = generateOAuthParams();

    const authUrl = buildAuthUrl({
      clientId: TWITTER_CLIENT_ID,
      redirectUri: CALLBACK_URL,
      state,
      codeChallenge,
    });

    const response = NextResponse.redirect(authUrl);

    response.cookies.set('moltbook_oauth_state', serializeOAuthCookie({ state, codeVerifier, claimToken }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    return response;
  } catch (err) {
    return errorResponse(err);
  }
}
