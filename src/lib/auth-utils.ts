/**
 * Authentication utilities
 * Converted from MOLTBOOK API's utils/auth.js
 */

import crypto from 'crypto';

const TOKEN_PREFIX = 'moltbook_';
const CLAIM_PREFIX = 'moltbook_claim_';
const TOKEN_LENGTH = 32;

const ADJECTIVES = [
  'reef', 'wave', 'coral', 'shell', 'tide', 'kelp', 'foam', 'salt',
  'deep', 'blue', 'aqua', 'pearl', 'sand', 'surf', 'cove', 'bay',
];

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateApiKey(): string {
  return `${TOKEN_PREFIX}${randomHex(TOKEN_LENGTH)}`;
}

export function generateClaimToken(): string {
  return `${CLAIM_PREFIX}${randomHex(TOKEN_LENGTH)}`;
}

export function generateVerificationCode(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const suffix = randomHex(2).toUpperCase();
  return `${adjective}-${suffix}`;
}

export function validateApiKey(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  if (!token.startsWith(TOKEN_PREFIX)) return false;

  const expectedLength = TOKEN_PREFIX.length + TOKEN_LENGTH * 2;
  if (token.length !== expectedLength) return false;

  const body = token.slice(TOKEN_PREFIX.length);
  return /^[0-9a-f]+$/i.test(body);
}

export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;

  const [scheme, token] = parts;
  if (scheme.toLowerCase() !== 'bearer') return null;

  return token;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function compareTokens(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
