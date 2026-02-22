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
      return redirectWithError('expired', 'OAuth session expired. Please try again.');
    }

    const { state: savedState, codeVerifier, claimToken } = deserializeOAuthCookie(cookieValue);

    if (!state || state !== savedState) {
      return redirectToClaimPage(claimToken, {
        error: 'invalid_state',
        message: 'Invalid OAuth state. Please try again.',
      });
    }

    if (error || !code) {
      return redirectToClaimPage(claimToken, {
        error: 'denied',
        message: 'Twitter authorization was denied.',
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
    console.error('Twitter callback error:', err);

    const cookieValue = req.cookies.get('moltbook_oauth_state')?.value;
    if (cookieValue) {
      try {
        const { claimToken } = deserializeOAuthCookie(cookieValue);
        return redirectToClaimPage(claimToken, {
          error: 'server_error',
          message: 'An unexpected error occurred. Please try again.',
        });
      } catch {
        // cookie parsing failed
      }
    }

    return redirectWithError('server_error', 'An unexpected error occurred.');
  }
}
