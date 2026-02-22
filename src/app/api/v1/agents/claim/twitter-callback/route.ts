import { NextRequest, NextResponse } from 'next/server';
import { AgentService } from '@/services/agent';
import { deserializeOAuthCookie, exchangeCodeForToken, getTwitterUser } from '@/lib/twitter-oauth';

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CALLBACK_URL = `${BASE_URL}/api/v1/agents/claim/twitter-callback`;

function redirectToClaimPage(claimToken: string, params: Record<string, string>) {
  const url = new URL(`${BASE_URL}/claim/${claimToken}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url.toString());
}

function redirectWithError(errorCode: string, message: string) {
  const url = new URL(`${BASE_URL}/auth/login`);
  url.searchParams.set('error', errorCode);
  url.searchParams.set('message', message);
  return NextResponse.redirect(url.toString());
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    const cookieValue = req.cookies.get('moltbook_oauth_state')?.value;
    if (!cookieValue) {
      return redirectWithError('expired', 'OAuth 세션이 만료되었습니다. 다시 시도해주세요.');
    }

    const { state: savedState, codeVerifier, claimToken } = deserializeOAuthCookie(cookieValue);

    if (!state || state !== savedState) {
      return redirectToClaimPage(claimToken, {
        error: 'invalid_state',
        message: 'OAuth 상태가 올바르지 않습니다. 다시 시도해주세요.',
      });
    }

    if (error || !code) {
      return redirectToClaimPage(claimToken, {
        error: 'denied',
        message: 'Twitter 인증이 거부되었습니다.',
      });
    }

    const accessToken = await exchangeCodeForToken({
      code,
      codeVerifier,
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
      redirectUri: CALLBACK_URL,
    });

    const twitterUser = await getTwitterUser(accessToken);

    await AgentService.claim(claimToken, {
      id: twitterUser.id,
      handle: twitterUser.username,
    });

    const response = redirectToClaimPage(claimToken, {
      success: 'true',
      handle: twitterUser.username,
    });
    response.cookies.delete('moltbook_oauth_state');
    return response;
  } catch (err) {
    console.error('Twitter 콜백 오류:', err);

    const cookieValue = req.cookies.get('moltbook_oauth_state')?.value;
    if (cookieValue) {
      try {
        const { claimToken } = deserializeOAuthCookie(cookieValue);
        return redirectToClaimPage(claimToken, {
          error: 'server_error',
          message: '예기치 않은 오류가 발생했습니다. 다시 시도해주세요.',
        });
      } catch {
        // cookie parsing failed
      }
    }

    return redirectWithError('server_error', '예기치 않은 오류가 발생했습니다.');
  }
}
