/**
 * Twitter/X OAuth 2.0 PKCE helpers
 * Used for claim flow - no external dependencies
 */

import crypto from 'crypto';

const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const TWITTER_USER_URL = 'https://api.twitter.com/2/users/me';

export interface OAuthState {
  state: string;
  codeVerifier: string;
  claimToken: string;
}

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
}

export function generateOAuthParams() {
  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { state, codeVerifier, codeChallenge };
}

export function buildAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(TWITTER_AUTH_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', 'tweet.read users.read');
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function exchangeCodeForToken(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<string> {
  const response = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Twitter token exchange failed: ${response.status} ${errorBody}`);
  }

  const { access_token } = await response.json();
  return access_token;
}

export async function getTwitterUser(accessToken: string): Promise<TwitterUser> {
  const response = await fetch(TWITTER_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Twitter user fetch failed: ${response.status}`);
  }

  const { data } = await response.json();
  return data as TwitterUser;
}

export function serializeOAuthCookie(params: OAuthState): string {
  return JSON.stringify(params);
}

export function deserializeOAuthCookie(value: string): OAuthState {
  return JSON.parse(value);
}
